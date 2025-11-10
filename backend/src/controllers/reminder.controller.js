const Reminder = require('../models/reminder.model');
const User = require('../models/user.model');

const ensureCanManagePatient = async (requesterId, patientId) => {
  const requester = await User.findById(requesterId);
  if (!requester) return false;
  if (requester.type === 'doctor') return true;
  if (requester.type === 'caretaker') {
    return requester.assignedPatients?.some(p => p.toString() === patientId.toString());
  }
  return requesterId.toString() === patientId.toString();
};

exports.create = async (req, res) => {
  try {
    const { patientId, title, text, date, time, isRecurring } = req.body;
    if (!(await ensureCanManagePatient(req.user.id, patientId))) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const reminder = await Reminder.create({
      patient: patientId,
      createdBy: req.user.id,
      title,
      text,
      date,
      time,
      isRecurring: !!isRecurring
    });
    res.status(201).json({ success: true, reminder });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Create reminder failed', error: e.message });
  }
};

exports.listForPatient = async (req, res) => {
  try {
    const patientId = req.params.patientId || req.user.id;
    if (!(await ensureCanManagePatient(req.user.id, patientId))) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    const reminders = await Reminder.find({ patient: patientId }).sort({ date: 1, time: 1 });
    res.json({ success: true, reminders });
  } catch (e) {
    res.status(500).json({ success: false, message: 'List reminders failed', error: e.message });
  }
};

exports.complete = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await Reminder.findById(id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Not found' });
    if (!(await ensureCanManagePatient(req.user.id, reminder.patient))) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    reminder.status = 'completed';
    await reminder.save();

    // Auto-generate next day instance if recurring
    if (reminder.isRecurring) {
  // Get tomorrow’s date based on today
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // If you have a specific reminder time (e.g. "14:30"), set it here
  if (reminder.time) {
    const [hours, minutes] = reminder.time.split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);
  }

  await Reminder.create({
    patient: reminder.patient,
    createdBy: req.user.id,
    title: reminder.title,
    text: reminder.text,
    date: tomorrow,
    time: reminder.time,
    isRecurring: true
  });
}


    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Complete failed', error: e.message });
  }
};