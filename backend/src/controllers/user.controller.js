const User = require('../models/user.model');
exports.createUser = async (req, res) => {
  try {
    const { email, password, phone, type, doctorInfo, caretakerInfo, patientDetails } = req.body;
    const doctor = await User.findById(req.user.id);
    if (doctor.type !== 'doctor') return res.status(403).json({ success: false, message: 'Doctors only' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email exists' });

    if (!['patient', 'caretaker'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    const userFields = { email, password, phone, type, createdBy: doctor._id };
    if (type === 'patient') {
      userFields.patientDetails = patientDetails;
      userFields.doctor = [{
        doctorDegree: doctor.doctorDegree || '',
        doctorName: doctor.doctorName || doctor.email,
        doctorphone: doctor.phone || '',
        doctoremail: doctor.email || ''
      }];
    }

    const user = new User(userFields);
    await user.save();

    // If user is a patient, push the patient _id to doctor's assignedPatients array
    if (type === 'patient') {
      doctor.assignedPatients.push(user._id);
      await doctor.save();
    }

    if (type === 'caretaker') {
      doctor.assignedCaretakers.push(user._id);
      await doctor.save();
    }

    res.status(201).json({
      success: true,
      message: `${type} created`,
      user: { id: user._id, email: user.email, phone: user.phone, type: user.type }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Create error', error: error.message });
  }
};

exports.getMyPatients = async (req, res) => {
  try {
    const doctor = await User.findById(req.user.id);
    if (doctor.type !== 'doctor') return res.status(403).json({ success: false, message: 'Doctors only' });

    const users = await User.find({ createdBy: req.user.id }).select('-password -resetOTP -resetOTPExpiry').sort({ createdAt: -1 });
    const patients = users.filter(u => u.type === 'patient');
    const caretakers = users.filter(u => u.type === 'caretaker');

    res.json({ success: true, patients, caretakers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -resetOTP -resetOTPExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const requester = await User.findById(req.user.id);
    if (requester.type !== 'doctor' && req.params.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};
