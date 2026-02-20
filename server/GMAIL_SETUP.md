# Gmail App Password Setup Instructions

This project has been updated to use Gmail App Password authentication instead of OAuth for email sending. This is simpler and more reliable for server applications.

## Step-by-Step Setup

### 1. Enable 2-Factor Authentication
- Go to [Google Account Settings](https://myaccount.google.com/)
- Navigate to **Security** → **2-Step Verification**
- Enable 2-Step Verification if not already enabled

### 2. Generate App Password
- In **Security** → **2-Step Verification**, scroll down to **App passwords**
- Click on **App passwords**
- Select **Mail** from the dropdown
- Click **Generate**
- Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### 3. Update Environment Variables
In your `.env` file, update these variables:

```env
GMAIL_USER=vnrauditoriums@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop  # Replace with your generated app password
ADMIN_EMAIL=slalithaditya1@gmail.com
```

**Important Notes:**
- Remove any spaces from the app password
- The app password is different from your regular Gmail password
- Keep this password secure and don't share it

### 4. Test Email Functionality
After updating the `.env` file:
1. Restart your server
2. Try creating a booking to test email sending
3. Check server logs for email success/error messages

## Troubleshooting

### Common Issues:
1. **"Invalid credentials"** → Check if app password is correct
2. **"Less secure app access"** → This shouldn't occur with app passwords
3. **"EAUTH"** → Verify Gmail username and app password are correct

### Error Messages:
- `[Email FATAL] Missing required environment variables` → Check `.env` file
- `[Email Service WARN] Transporter verification failed` → Check credentials
- `SMTP AUTH ERROR` → Verify app password is correct

## Benefits of App Password Method

✅ **Simpler Setup** - No OAuth configuration needed  
✅ **More Reliable** - No token refresh issues  
✅ **Better Security** - App-specific passwords  
✅ **Easier Maintenance** - No periodic re-authentication  

## Migration Complete

The following changes were made:
- Removed `googleapis` dependency
- Updated email service to use simple SMTP authentication
- Simplified environment variables
- Removed OAuth-related code

Your email functionality will work exactly the same way - this is just a change in the authentication method.
