variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "codepulse"
}

variable "region" {
  description = "Region to deploy resources in"
  type        = string
  default     = "us-east-1"
}

variable "image_tag" {
  description = "Container image tag"
  type        = string
}

variable "desired_count" {
  description = "Desired count for ecs instance"
  type        = number
  default     = 0
}

variable "use_nat_gateway" {
  description = "Whether to use a NAT Gateway"
  type        = bool
}

variable "app_subnet_ids" {
  description = "List of private subnet IDs for the ECS instance"
  type        = list(string)
}

variable "task_sg_id" {
  description = "Security group ID for the ECS instance"
  type        = string
}

variable "target_group_arn" {
  description = "ARN of the target group for the ECS service"
  type        = string
}

variable "db_secret_arn" {
  description = "ARN of the RDS secret for the ECS service"
  type        = string
}
