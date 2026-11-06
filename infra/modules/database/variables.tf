variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "codepulse"
}

variable "db_subnet_ids" {
  description = "List of private subnet IDs for the RDS instance"
  type        = list(string)
}

variable "rds_sg_id" {
  description = "Security group ID for the RDS instance"
  type        = string
}