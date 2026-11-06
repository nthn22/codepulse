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

variable "alert_email" {
  description = "Email address to send alerts to"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ARN suffix of the ALB to monitor"
  type        = string
}

variable "waf_name" {
  description = "Name of the WAF to monitor"
  type        = string
}