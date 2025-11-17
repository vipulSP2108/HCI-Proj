# Healthcare Gamification App

## Overview

The Healthcare Gamification App is an interactive web application designed to engage **senior citizen** in managing their health through gamified elements. Patients can track consultations, access educational content, participate in health-related chats, and play mini-games to earn rewards and badges. The app promotes proactive healthcare by integrating appointment scheduling, personalized doctor recommendations, and progress tracking.

Key features include:
- **User Dashboard**: A easy sidebar-navigated interface with sections for Home (overview stats), Consults (appointment history), Learn (health tips and quizzes), Chat (real-time messaging with doctors), and Play Game (interactive challenges).
- **Appointment Scheduling**: Calendar view starting from the upcoming week (today + 7 days onward), with time slots for morning (9 AM - 12 PM), afternoon (2 PM - 5 PM), and evening (6 PM - 9 PM). Prevents booking past dates.
- **Gamification Elements**: Earn points for completing learns, chats, and games; unlock badges for milestones like consistent check-ins.
- **Doctor Views**: Manage patient schedules, view analytics, and approve consultations.
- **Responsive Design**: Built with Tailwind CSS for seamless mobile and desktop experience.

The app is built for healthcare providers and patients, emphasizing user-friendly navigation and data privacy.

## Tech Stack

- **Frontend**: React.js with Tailwind CSS for styling and responsive layouts.
- **Backend**: Node.js with Express (serverless functions on Vercel).
- **Database**: Supabase (for user auth, appointments, and gamification data).
- **Other Tools**: React Router for navigation, react-toastify for notifications, and Linking API for external resources.

## Deployment

- **Frontend**: Hosted on Vercel at [https://hci-proj-q8al.vercel.app/](https://hci-proj-q8al.vercel.app/).
- **Backend**: Also hosted on Vercel as serverless API endpoints (e.g., `/api/games`, `/api/appointments`, `/api/users`, `/api/reminders`).

Access the live demo directly via the frontend URL. No additional setup required for hosted version.

## Local Setup & Running the App

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Git

### Steps

1. **Clone the Repository**:
   ```
   git clone https://github.com/yourusername/healthcare-gamification-app.git
   cd healthcare-gamification-app
   ```

2. **Install Dependencies**:
   - For Frontend (in `/frontend` directory):
     ```
     npm install
     ```
   - For Backend (in `/backend` directory):
     ```
     npm install
     ```

3. **Environment Setup**:
   - Create a `.env` file in both frontend and backend directories.
   - To obtain the actual environment variable values, please contact me at **[vipul.patil@iitgn.ac.in](mailto:vipul.patil@iitgn.ac.in)**.
     ```
     MONGODB_URI = # contact me at **vipul.patil@iitgn.ac.in**.
     JWT_SECRET = # contact me at **vipul.patil@iitgn.ac.in**.
     PORT = 5001
     NODE_ENV = development
     ```

4. **Run the Backend**:
   ```
   cd backend
   npm run dev
   ```
   - Server starts at `http://localhost:3001` (or port specified in `.env`).

5. **Run the Frontend**:
   ```
   cd frontend
   npm start
   ```
   - App opens at `http://localhost:5173` (or port specified in `.env`).

### Troubleshooting
- If you encounter CORS issues, ensure backend allows frontend origin in middleware.
- For appointment scheduling errors, verify date logic restricts to future weeks only.
- Check console for toast notifications on successful logins or bookings.

## Sample Login Credentials

The app supports three user roles: Patient, Doctor, and Admin. Use these for testing (passwords are simple for demo purposes; change in production).

| Role    | Username/Email          | Password | Notes |
|---------|-------------------------|----------|-------|
| Patient | patient@gmail.com    | Patient@123 | Access dashboard, book appointments, play games. Starts with sample stats (e.g., 150 points, 3 badges). |
| Doctor  | doctor@gmail.com     | Doctor@123  | View patient schedules, chat history, approve consults. |
| Caretaker   | admin@gmail.com      | Caretaker@123   | Full access: Manage users, view analytics, edit gamification rules. |

- Login via the `/login` route.
- After login, redirect to `/dashboard` based on role.
- Forgot password? Use the reset flow (emails via Supabase).

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add some amazing feature'`).
4. Push to branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## Contact

For issues or feedback, open a GitHub issue or email [vipul.patil@iitgn.ac.in](mailto:vipul.patil@iitgn.ac.in).

---

*Last Updated: November 17, 2025*
