const User = require('../models/user.model');

exports.getMyPatients = async (req, res) => {
  try {
    // Example: fetch patients assigned to the logged-in doctor
    const doctor = await User.findById(req.user.id).populate('assignedPatients');
    res.json({ success: true, patients: doctor.assignedPatients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching patients.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, phone, type, doctorInfo, patientDetails, caretakerInfo } = req.body;
    const doctorUser = await User.findById(req.user.id);

    if (doctorUser.type !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can create users.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const userFields = { email, password, phone, type, patientDetails, doctor: undefined, createdBy: doctorUser._id };

    if (type === 'patient') {
      userFields.patientDetails = patientDetails;
      userFields.doctor = [{
        doctorDegree: doctorUser.doctorDegree || '',
        doctorName: doctorUser.name,
        doctorteli: doctorUser.phone || '',
        doctoremail: doctorUser.email || ''
      }];
    }

    if (type === 'caretaker' && caretakerInfo) {
      userFields.caretaker = [caretakerInfo];
    }

    console.log(userFields);

    const newUser = new User(userFields);
    await newUser.save();

    if (type === 'patient') {
      doctorUser.assignedPatients = doctorUser.assignedPatients || [];
      doctorUser.assignedPatients.push(newUser._id);
    } else if (type === 'caretaker') {
      doctorUser.assignedCaretakers = doctorUser.assignedCaretakers || [];
      doctorUser.assignedCaretakers.push(newUser._id);
    }
    await doctorUser.save();

    res.status(201).json({ success: true, message: `${type} created and assigned successfully.`, user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error creating user.' });
  }
};

exports.assignCaretakerToPatient = async (req, res) => {
  try {
    const { caretakerId, patientId } = req.body;

    await User.findByIdAndUpdate(caretakerId, { $addToSet: { assignedPatients: patientId } });
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { assignedCaretakers: caretakerId } });

    res.json({ success: true, message: 'Caretaker assigned successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error assigning caretaker.' });
  }
};

exports.getCaretakerWithPatients = async (req, res) => {
  try {
    const caretaker = await User.findById(req.params.caretakerId)
      .populate('assignedPatients', 'email phone patientDetails.diagnosis totalScore');

    if (!caretaker) {
      return res.status(404).json({ success: false, message: 'Caretaker not found.' });
    }
    res.json({ success: true, caretaker });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching caretaker details.' });
  }
};
