variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "codepulse"
}

variable "vpc_id" {
  description = "VPC ID where the security groups will be created"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the load balancer"
  type        = list(string)
}

variable "alb_sg_id" {
  description = "Security group ID for the ALB"
  type        = string
}