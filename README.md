# Buroq Billing - Integrated Mikrotik Billing System

Buroq Billing is a modern, full-stack web application designed to streamline billing and user management for Mikrotik-based ISP networks. Built with **Next.js 14**, **Prisma ORM**, and **Mikrotik API**, it provides a robust solution for managing PPPoE services, tracking payments, and calculating staff commissions.

## 🚀 Key Features

### � Network Management
- **Mikrotik Integration**: Direct connection to Mikrotik routers via API.
- **PPPoE Management**: Create, edit, and delete PPPoE users directly from the dashboard.
- **Active Connections**: Real-time monitoring of online users and session duration.
- **Remote Actions**: Instantly disconnect active sessions.

### 💰 Billing & Finance
- **Automated Invoicing**: Generate monthly invoices for all customers.
- **Payment Tracking**: Record manual payments and track payment history.
- **Auto-Drop**: Configurable logic to automatically disable unpaid users after a grace period.
- **Financial Reports**: Visual charts for revenue, paid vs. unpaid users, and growth trends.

### 👥 User & Staff Management
- **Staff System**: Comprehensive role-based access for Admins, Staff (formerly Partner), Agents, and Technicians.
- **Commission Tracking**: Automatic calculation of commissions for staff, agents, and technicians.
- **Customer Portal**: Dedicated view for customers to check their package info and payment status.

### 🛠 System & Tools
- **Database**: SQLite database managed via Prisma ORM.
- **Auto Backup**: 
  - **Database**: Daily automatic backup to local storage.
  - **Mikrotik**: Daily automatic configuration backup `.backup` files on the router itself.
- **Theme Support**: Dark/Light mode, Glassmorphism, and customizable color themes.
- **Localization**: Full support for English and Indonesian languages.
- **Responsive Design**: Built with Tailwind CSS for seamless mobile and desktop experience.

## 💻 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [SQLite](https://www.sqlite.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/), [Recharts](https://recharts.org/)
- **Authentication**: Custom session-based auth with bcrypt hashing.

## �️ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/nurwendi/NetFlow.git
    cd NetFlow
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Setup Database**
    Initialize the SQLite database and apply migrations:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

4.  **Initial Configuration**
    - The system creates a default admin user on first run if none exists:
        - **Username**: `admin`
        - **Password**: `admin`
    - **Security Note**: Change this password immediately after logging in!

5.  **Run the Development Server**
    ```bash
    npm run dev
    ```

## ⚡ Quick Start (One-Line Install)

Get up and running immediately with our automated installers.

### 🐧 Linux / Mac (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/nurwendi/mikrotikbilling/main/install.sh | bash
```

### 🪟 Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/nurwendi/mikrotikbilling/main/install.ps1 | iex
```

### 🗑️ Uninstall / Reset
**Linux**: `./uninstall.sh`
**Windows**: `.\uninstall.ps1`

## ⚙️ Configuration

### Mikrotik Connection
Navigate to **Settings > Mikrotik Connections** to add your router credentials:
- **Host**: IP address of your Mikrotik router.
- **Port**: API port (default: 8728).
- **Username/Password**: Router login with API permissions.

### System Settings
- **Billing Config**: Set invoice prefixes, currencies, and due dates in **Settings > Billing**.
- **Backup**: Download database backups from **Settings > Backup & Restore**.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
