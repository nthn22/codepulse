# main terraform file

# create network module
module "network" {
  source = "./modules/network"

  project_name    = var.project_name
  vpc_cidr        = var.vpc_cidr
  use_nat_gateway = var.use_nat_gateway
}

# create security module
module "security" {
  source       = "./modules/security"
  project_name = var.project_name
  vpc_id       = module.network.vpc_id   # root passes it in
}