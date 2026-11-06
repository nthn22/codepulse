output "vpc_id" {
    value = aws_vpc.main_vpc.id
}

output "public_subnet_ids" {
    value = [for k, v in local.subnets : aws_subnet.this[k].id if v.tier == "public"]
}

output "app_subnet_ids" {
    value = [for k, v in local.subnets : aws_subnet.this[k].id if v.tier == "app"]
}

output "db_subnet_ids" {
    value = [for k, v in local.subnets : aws_subnet.this[k].id if v.tier == "db"]
}
