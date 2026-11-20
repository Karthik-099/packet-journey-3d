output "resource_group" {
  value = azurerm_resource_group.rg.name
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.aks.name
}

output "get_credentials" {
  description = "Command to configure kubectl"
  value       = "az aks get-credentials -g ${azurerm_resource_group.rg.name} -n ${azurerm_kubernetes_cluster.aks.name}"
}

output "oidc_issuer_url" {
  value = azurerm_kubernetes_cluster.aks.oidc_issuer_url
}
