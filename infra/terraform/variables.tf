variable "subscription_id" {
  description = "Azure subscription to deploy into"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "centralindia"
}

variable "name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "packet-journey"
}

variable "kubernetes_version" {
  description = "AKS version (null = latest default)"
  type        = string
  default     = null
}

variable "node_vm_size" {
  type    = string
  default = "Standard_B2s"
}

variable "node_min" {
  type    = number
  default = 1
}

variable "node_max" {
  type    = number
  default = 3
}

variable "repo_url" {
  description = "Git repository Argo CD syncs from"
  type        = string
  default     = "https://github.com/Karthik-099/packet-journey-3d.git"
}
