# ACA Control Center - Values to set in the existing server .env

DO NOT replace the existing .env file. Keep your POSTGRES_PASSWORD, JWT_SECRET, ADMIN_EMAIL and ADMIN_PASSWORD unchanged.

Change these existing keys:

    COOKIE_SECURE=true
    PUBLIC_ORIGIN=https://control.amalficoastartistry.com

Append this new key (the email address will be used to register Let's Encrypt certificates):

    ACME_EMAIL=your-real-email@example.com

Do not commit the real .env or the generated Traefik BasicAuth password hash to Git.

The HTTPS Docker Compose overlay additionally forces COOKIE_SECURE and PUBLIC_ORIGIN to the correct production values, but updating .env avoids ambiguity and protects accidental starts without the overlay.
