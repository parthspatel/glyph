//! Glyph CLI
//!
//! Administrative command-line tool for Glyph.

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "glyph")]
#[command(about = "Glyph administration CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// User management commands
    User {
        #[command(subcommand)]
        action: UserCommands,
    },
    /// Project management commands
    Project {
        #[command(subcommand)]
        action: ProjectCommands,
    },
}

#[derive(Subcommand)]
enum UserCommands {
    /// List all users
    List,
    /// Create a new user
    Create {
        #[arg(short, long)]
        email: String,
    },
}

#[derive(Subcommand)]
enum ProjectCommands {
    /// List all projects
    List,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::User { action } => match action {
            UserCommands::List => {
                println!("Listing users... (not implemented)");
            }
            UserCommands::Create { email } => {
                println!("Creating user with email: {email} (not implemented)");
            }
        },
        Commands::Project { action } => match action {
            ProjectCommands::List => {
                println!("Listing projects... (not implemented)");
            }
        },
    }
}
