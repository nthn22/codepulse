# monitoring config for the container

# where alerts go
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
}

# subscription to the alerts
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn # arn for the topic above
  protocol  = "email"
  endpoint  = var.alert_email
}

#alarm - app return 5xx issues
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.project_name}-5xx-alarm"
  alarm_description   = "Alarm for the app returning 5xx issues"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count" # errors from the app
  statistic           = "Sum"
  period              = 300 # 5 minutes in sec
  evaluation_periods  = 1
  threshold           = 5 # alert if 5 or more errors in 5 min
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching" # no traffic means no data - don't want it as alarm

  dimensions = {
    LoadBalancer = aws_lb.alb.arn_suffix # alb listener
  }

  alarm_actions = [aws_sns_topic.alerts.arn] #send alarm here
}

#alarm - waf blocking requests

##Dimensions: WebACL = the ACL’s name, Region = your region, Rule = "ALL"
##A threshold like 50 in 5 minutes means someone’s actively being blocked
resource "aws_cloudwatch_metric_alarm" "waf_blocked" {
  alarm_name          = "${var.project_name}-waf-alarm"
  alarm_description   = "Alarm for WAF blocking requests"
  namespace           = "AWS/WAFV2" # waf namespace
  metric_name         = "BlockedRequests"
  statistic           = Sum
  period              = 300 # 5 min in sec
  evaluation_periods  = 1
  threshold           = 50 # to indicate someone's being blocked
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WEBACL = aws_wafv2_web_acl.waf.name # web acl name 
    Region = var.region
    Rule   = "ALL"
  }

  alarm_actions = [aws_sns_topic.alerts.arn] #send alarm here

}

