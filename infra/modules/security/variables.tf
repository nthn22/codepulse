variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "codepulse"
}

variable "vpc_id" {
  description = "VPC ID where the security groups will be created"
  type        = string
}