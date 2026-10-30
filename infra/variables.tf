variable "region" {
  description = "Region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "use_nat_gateway" {
  description = "Whether to use a NAT Gateway"
  type        = bool
  default     = false
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "codepulse"
}

variable "desired_count" {
  description = "Desired count for ecs instance"
  type        = number
  default     = 0
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
}

variable "alert_email" {
  type = string
}