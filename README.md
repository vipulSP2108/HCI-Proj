# Healthcare Gamification App v2.1 - Updated Schema

## 🎯 NEW DATA STRUCTURE

### User Schema
```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  phone: String,
  type: "doctor" | "patient" | "caretaker",
  createdBy: ObjectId,
  currentlevelspan: Number, // Time user gets to respond (1-10 seconds)

  game: [{
    type: "type1",
    name: "Reaction Game",
    eachGameStats: [{
      time: Date,  // When game session started
      levelspan: Number,  // levelspan used for this session
      play: [{
        responsetime: Number,  // 0 to levelspan OR -1 if exceeded
        correct: Number  // 1=correct, -1=incorrect, 0=not done
      }]
    }]
  }],

  level: Number,
  totalScore: Number,
  resetOTP: String,
  resetOTPExpiry: Date,
  isActive: Boolean
}
```

### Response Time Logic
- **levelspan**: How many seconds user has to press A or S
- **responsetime**: 
  - If user responds within levelspan: 0 to levelspan (e.g., 2.2 seconds)
  - If user exceeds levelspan: -1
- **correct**:
  - `1`: Correct response
  - `-1`: Incorrect response
  - `0`: Not done (exceeded levelspan)

### Example Data
```javascript
{
  currentlevelspan: 5,
  game: [{
    type: "type1",
    name: "Reaction Game",
    eachGameStats: [{
      time: "2025-10-17T20:47:35.341Z",
      levelspan: 5,
      play: [
        { responsetime: 2.2, correct: 1 },  // Correct in 2.2s
        { responsetime: 2.1, correct: -1 }, // Incorrect in 2.1s
        { responsetime: -1, correct: 0 },   // Not done (exceeded 5s)
        { responsetime: 1.5, correct: 1 }   // Correct in 1.5s
      ]
    }]
  }]
}
```

## 📊 VISUALIZATIONS

### Doctor View (PatientAnalytics Page)

1. **Response Time Scatter Plot**
   - X-axis: Attempt number (1, 2, 3, ...)
   - Y-axis: Response time (0 to levelspan)
   - Color coded:
     - Green dots: Correct (responsetime >= 0, correct = 1)
     - Red dots: Incorrect (responsetime >= 0, correct = -1)
     - Yellow dots: Not done (responsetime = -1, correct = 0)
   - Shows exact response time for each attempt

2. **Correct/Incorrect/NotDone Bar Chart**
   - Per session comparison
   - Stacked or grouped bars

3. **Distribution Pie Chart**
   - Overall: Correct vs Incorrect vs Not Done

4. **Average Response Time Line Chart**
   - Shows improvement over sessions

## 🎮 GAME MECHANICS

1. Letter 'A' or 'S' appears on screen
2. Timer starts (based on currentlevelspan)
3. User has currentlevelspan seconds to press correct key
4. System records:
   - Actual response time (e.g., 2.2s)
   - Whether correct/incorrect/not done
5. If time exceeds levelspan → responsetime = -1, correct = 0
6. Audio feedback plays
7. Next letter appears

## ⚙️ SETTINGS

### currentlevelspan (Editable by Doctor & Caretaker)
- Range: 1-10 seconds
- Determines how long user has to respond
- Can be adjusted per patient
- Affects difficulty

## 🎨 UI FEATURES

- Beautiful gradient backgrounds
- Recharts visualizations
- Lucide-react icons
- Responsive design
- Real-time feedback

## 🚀 SETUP

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with MongoDB and Gmail
npm run dev

# Frontend
cd frontend
npm install
npm start
```

## 📝 API ENDPOINTS

### Game Routes
- `PUT /api/game/levelspan/:userId` - Update levelspan
- `GET /api/game/levelspan/:userId?` - Get levelspan
- `POST /api/game/save-session` - Save game session
- `GET /api/game/analytics/:userId` - Get detailed analytics (doctor)
- `GET /api/game/stats/:userId?` - Get basic stats

### Request Example
```javascript
// Save game session
POST /api/game/save-session
{
  "levelspan": 5,
  "playData": [
    { "responsetime": 2.2, "correct": 1 },
    { "responsetime": 2.1, "correct": -1 },
    { "responsetime": -1, "correct": 0 }
  ]
}
```

## 🎯 KEY FEATURES

✅ Updated schema matching your exact requirements
✅ Response time tracking (0 to levelspan or -1)
✅ Correct values: 1, -1, 0
✅ currentlevelspan editable by doctor/caretaker
✅ Proper visualization of response times
✅ Session-by-session tracking
✅ Audio feedback
✅ Beautiful charts

## 📦 SCORING

- Correct (+1): +10 points
- Incorrect (-1): -5 points  
- Not done (0): 0 points
- Total score affects level

## 🔒 SECURITY

- Same as v2.0
- JWT authentication
- Password hashing
- OTP email (5 min expiry)
- Role-based access

Ready to use! Just configure MongoDB and Gmail credentials.
