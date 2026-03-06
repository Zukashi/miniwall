output "vm_external_ip" {
  description = "Public IP of the MiniWall VM"
  value       = google_compute_instance.miniwall_vm.network_interface[0].access_config[0].nat_ip
}
