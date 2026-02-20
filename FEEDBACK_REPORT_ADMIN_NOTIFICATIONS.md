# Feedback and Report Admin Email Notifications

## Overview
This feature automatically sends email notifications to the admin when users submit feedback or reports through the system. The admin receives immediate email alerts but there are no visual changes to the website interface.

## Features Added

### **Email Notifications Only**

#### **1. Feedback Notification to Admin**
When a user submits feedback, the admin receives an email with:
- **Subject**: "💬 New Feedback Submitted: [Feedback Subject]"
- **Content includes**:
  - User information (name, username, email)
  - Feedback details (subject, type, message)
  - Number of attachments (if any)
  - Timestamp of submission
  - Partial feedback ID for reference

#### **2. Report Notification to Admin**
When a user submits a report, the admin receives an email with:
- **Subject**: "🚨 New Report Submitted: [Report Subject]"
- **Content includes**:
  - Reporter information (name, username, email)
  - Report details (subject, type, severity, description)
  - Number of evidence files (if any)
  - Timestamp of submission
  - Partial report ID for reference
  - Color-coded severity indicators (low=green, medium=yellow, high=red, critical=dark red)

### **3. Admin Dashboard Statistics API**
New endpoint `/api/admin/admin-dashboard-stats` provides:
- Total feedback and reports count
- Pending/unread counts
- Recent submissions (last 5 of each)
- Notification counts for potential future dashboard integration

## Technical Implementation

### Backend Changes

#### New Email Functions
- `sendFeedbackNotificationToAdmin()` - Sends feedback notifications
- `sendReportNotificationToAdmin()` - Sends report notifications

#### Modified Controllers
- **profileController.js**: Updated `submitFeedback()` and `submitReport()` to send admin notifications
- **adminProfileController.js**: Added `getAdminDashboardStats()` for dashboard statistics

#### New API Endpoints
```
GET /api/admin/admin-dashboard-stats - Get notification counts and recent activity
```

### Configuration
- Uses existing `ADMIN_EMAIL` environment variable
- Integrates with existing Gmail email service
- Email notifications are non-blocking (won't fail submission if email fails)

## Usage

### For Users
No changes needed - feedback and report submission works exactly as before, but now admins get email notifications.

### For Admins
- **Email Notifications**: Check your configured admin email for new feedback/report notifications
- **Dashboard Stats**: The API endpoint is available if you want to build custom dashboard features

### API Endpoints

#### Get Admin Dashboard Statistics
```
GET /api/admin/admin-dashboard-stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "feedback": {
      "total": 25,
      "pending": 3,
      "unread": 2,
      "recent": [...]
    },
    "reports": {
      "total": 8,
      "pending": 1,
      "urgent": 0,
      "recent": [...]
    },
    "notifications": {
      "totalUnread": 3,
      "feedbackUnread": 2,
      "reportsUnread": 1
    }
  }
}
```

## How Email Notifications Work

### **Email Flow**:
1. User submits feedback/report → Saved to database
2. System automatically calls email service
3. Professional HTML email sent to `ADMIN_EMAIL`
4. Admin receives immediate notification

### **Email Templates**:
The emails are professionally formatted with:
- Professional HTML layout
- Color-coded priority/severity sections
- Organized information tables
- Mobile-responsive design
- Clear call-to-action messages

## Benefits

1. **Immediate Awareness** - Get notified the moment someone submits feedback or reports an issue
2. **Professional Communication** - Well-formatted emails with all necessary details
3. **Non-intrusive** - Email failures don't affect user experience
4. **No UI Changes** - Website interface remains unchanged
5. **Mobile-Friendly** - Email templates work on all devices

## Future Enhancements

Potential improvements could include:
- SMS notifications for critical reports
- Email digests for multiple submissions
- Admin notification preferences
- Team-based notification routing
- Integration with ticketing systems

## File Structure

### Backend Files Added/Modified
```
server/
├── controllers/
│   ├── profileController.js (modified)
│   └── adminProfileController.js (modified)
├── routes/
│   └── adminProfileRoutes.js (modified)
└── utils/
    └── emailService.js (modified)
```

### Frontend Files
No frontend changes - the website interface remains exactly the same.

## Dependencies

### Backend
- Existing nodemailer setup for email service
- Existing MongoDB models (Feedback, Report)
- Existing authentication middleware

### Frontend
No additional dependencies or changes required.

## Email Configuration

Make sure your `.env` file has:
```
ADMIN_EMAIL=your-admin-email@domain.com
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

The system will automatically send notifications to the `ADMIN_EMAIL` address whenever users submit feedback or reports.
