terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# VM instance running the MiniWall Docker stack
resource "google_compute_instance" "miniwall_vm" {
  name         = "miniwall-vm"
  machine_type = var.machine_type
  zone         = "${var.region}-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
    }
  }

  network_interface {
    network = "default"
    access_config {}  # assigns a public IP
  }

  tags = ["miniwall-server"]

  # Install Docker on first boot
  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
  EOF
}

# Firewall rule — allow inbound traffic on port 3000
resource "google_compute_firewall" "allow_miniwall" {
  name    = "allow-miniwall"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["3000"]
  }

  target_tags   = ["miniwall-server"]
  source_ranges = ["0.0.0.0/0"]
}
