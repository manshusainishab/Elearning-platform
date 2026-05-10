resource "aws_ecs_service" "theta_backend" {
  name            = "theta-backend"
  cluster         = aws_ecs_cluster.theta.id
  task_definition = aws_ecs_task_definition.theta_backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_task.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.theta_backend.arn
    container_name   = "theta-backend"
    container_port   = 5000
  }

  health_check_grace_period_seconds = 60

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.http]

  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}
