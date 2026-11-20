terraform {
  required_version = ">= 1.6"
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 4.0" }
    helm    = { source = "hashicorp/helm", version = "~> 2.15" }
  }
  # Use a remote backend so state isn't on a laptop, e.g.:
  # backend "azurerm" {
  #   resource_group_name  = "tfstate-rg"
  #   storage_account_name = "tfstatepj"
  #   container_name       = "tfstate"
  #   key                  = "packet-journey.tfstate"
  # }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

provider "helm" {
  kubernetes {
    host                   = azurerm_kubernetes_cluster.aks.kube_config[0].host
    client_certificate     = base64decode(azurerm_kubernetes_cluster.aks.kube_config[0].client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.aks.kube_config[0].client_key)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.aks.kube_config[0].cluster_ca_certificate)
  }
}
