import User from '../models/user.model.js';

export const getHospitalDoctors = async (req, res) => {
  const helpdeskId = req.user.id;
  const { search } = req.query;

  try {
    const helpdeskUser = await User.findById(helpdeskId);
    if (!helpdeskUser || helpdeskUser.role !== 'helpdesk') {
      return res.status(403).json({ message: 'Access denied. For helpdesk staff only.' });
    }

    const query = {
      role: 'doctor',
      hospitalName: helpdeskUser.hospitalName,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    const doctors = await User.find(query).select('-password');
    res.json(doctors);

  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
