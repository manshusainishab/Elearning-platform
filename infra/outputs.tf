output "ecr_repository_url" {
  description = "URL of the ECR repository for theta-backend"
  value       = aws_ecr_repository.theta_backend.repository_url
}

output "uploads_bucket_name" {
  description = "Name of the S3 bucket for user uploads"
  value       = aws_s3_bucket.uploads.bucket
}

output "vpc_id" {
  description = "ID of the main VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.theta.name
}

output "app_secrets_arn" {
  description = "ARN of the Secrets Manager secret for app env vars"
  value       = aws_secretsmanager_secret.app.arn
}

output "ecs_task_execution_role_arn" {
  description = "Task execution role ARN (used by ECS to pull image, write logs, fetch secrets)"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "Task role ARN (assumed by app code at runtime, has S3 access)"
  value       = aws_iam_role.ecs_task.arn
}

output "alb_dns_name" {
  description = "Public DNS name of the ALB - point your domain CNAME here"
  value       = aws_lb.theta.dns_name
}

output "acm_validation_records" {
  description = "DNS records to add at freedomain.one to validate the ACM cert"
  value = {
    for dvo in aws_acm_certificate.theta.domain_validation_options :
    dvo.domain_name => {
      type  = dvo.resource_record_type
      name  = dvo.resource_record_name
      value = dvo.resource_record_value
    }
  }
}

output "github_deploy_role_arn" {
  description = "ARN of the IAM role GitHub Actions assumes via OIDC for deploys"
  value       = aws_iam_role.github_deploy.arn
}
