# WAF config

# create the WAF web ACL
resource "aws_wafv2_web_acl" "waf" {
  name        = "${var.project_name}-waf"
  description = "WAF for ${var.project_name}"
  scope       = "REGIONAL" # use "CLOUDFRONT" for CloudFront distributions
  default_action {
    allow {}
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
    sampled_requests_enabled   = true
  }
  #create rules for the WAF web ACL
  #common rule set
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # implemented to override SizeRestrictions_Body in the common rule set
        # log instead of block
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {} # used to log
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-1"
      sampled_requests_enabled   = true
    }
  }
  #known bad input set
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-2"
      sampled_requests_enabled   = true
    }
  }
  #sqli rule set
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-3"
      sampled_requests_enabled   = true
    }
  }
  # rate limit rule
  rule {
    name     = "RateLimitPerIP"
    priority = 4
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 300 #request limit per 5 minutes
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rule-4"
      sampled_requests_enabled   = true
    }
  }
}

# waf web acl association
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.alb.arn            # alb arn
  web_acl_arn  = aws_wafv2_web_acl.waf.arn # web acl's arn
}