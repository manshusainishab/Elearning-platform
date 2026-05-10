resource "aws_cloudwatch_log_group" "theta_backend" {
  name              = "/ecs/theta-backend"
  retention_in_days = 7
}
