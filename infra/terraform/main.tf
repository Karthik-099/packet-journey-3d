resource "azurerm_resource_group" "rg" {
  name     = "${var.name}-rg"
  location = var.location
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "${var.name}-logs"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_kubernetes_cluster" "aks" {
  name                = "${var.name}-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = var.name
  kubernetes_version  = var.kubernetes_version
  sku_tier            = "Free"

  default_node_pool {
    name                 = "system"
    vm_size              = var.node_vm_size
    auto_scaling_enabled = true
    min_count            = var.node_min
    max_count            = var.node_max
    os_disk_type         = "Managed"
    upgrade_settings {
      max_surge = "33%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  # Azure CNI Overlay with the Cilium (eBPF) dataplane: pods get overlay IPs,
  # Cilium enforces NetworkPolicy without iptables-based kube-proxy rules.
  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    network_data_plane  = "cilium"
    network_policy      = "cilium"
    pod_cidr            = "10.244.0.0/16"
    service_cidr        = "10.0.0.0/16"
    dns_service_ip      = "10.0.0.10"
    load_balancer_sku   = "standard"
    outbound_type       = "loadBalancer"
  }

  # managed NGINX ingress (application routing add-on): ingressClassName webapprouting.kubernetes.azure.com
  web_app_routing {
    dns_zone_ids = []
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
  }

  tags = { app = var.name, managed_by = "terraform" }
}

# GitOps: Argo CD itself, then one Application pointing at the Helm chart in this repo.
resource "helm_release" "argocd" {
  name             = "argocd"
  namespace        = "argocd"
  create_namespace = true
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "7.7.0"
  values = [yamlencode({
    configs = { params = { "server.insecure" = true } }
  })]
}

resource "helm_release" "app" {
  name       = "packet-journey-app"
  namespace  = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argocd-apps"
  version    = "2.0.2"
  depends_on = [helm_release.argocd]
  values = [yamlencode({
    applications = {
      packet-journey = {
        namespace = "argocd"
        project   = "default"
        source = {
          repoURL        = var.repo_url
          targetRevision = "main"
          path           = "deploy/helm/packet-journey"
        }
        destination = { server = "https://kubernetes.default.svc", namespace = "packet-journey" }
        syncPolicy = {
          automated   = { prune = true, selfHeal = true }
          syncOptions = ["CreateNamespace=true"]
        }
      }
    }
  })]
}
