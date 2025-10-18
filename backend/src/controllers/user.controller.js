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

    // Find patients whose _id is in doctor's assignedPatients
    const patients = await User.find({ 
      _id: { $in: doctor.assignedPatients },
      type: 'patient'
    })
    .select('-password -resetOTP -resetOTPExpiry')
    .sort({ createdAt: -1 });

    // Optional: If you want caretakers separately
    const caretakers = await User.find({ 
      createdBy: req.user.id,
      type: 'caretaker'
    })
    .select('-password -resetOTP -resetOTPExpiry')
    .sort({ createdAt: -1 });

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

// Get logged-in doctor details
exports.getUserEditDetails = async (req, res) => {
  try {

    const user = await User.findById(req.user.id)
    // .select('degree name phone email');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Return doctor details directly
    res.json({ 
      success: true, 
      doctor: {
        degree: user.degree || '',
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch doctor details' });
  }
};


// Update logged-in doctor details
exports.updateUserDetails = async (req, res) => {
  try {
    console.log("asd");
    const { degree, name, phone, email } = req.body;
    const user = await User.findById(req.user.id);
    // if (user.type !== 'doctor') {
    //   return res.status(403).json({ success: false, message: 'Only doctors can update their details' });
    // }

    // Update existing fields directly on the user object
    user.degree = degree;
    user.name = name;
    user.phone = phone;
    user.email = email;

    await user.save();

    res.json({ success: true, message: 'Doctor details updated', doctor: {
      degree: user.degree,
      name: user.name,
      phone: user.phone,
      email: user.email,
    } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update doctor details' });
  }
};

s