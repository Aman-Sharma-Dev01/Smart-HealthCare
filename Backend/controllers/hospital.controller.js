import Hospital from '../models/hospital.model.js';

export const getNearbyHospitals = async (req, res) => {
  const { lng, lat } = req.query;

  if (!lng || !lat) {
    return res.status(400).json({ message: 'Longitude and latitude are required' });
  }

  try {
    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 10000, // 10km radius
        },
      },
    });
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
// --- NEW FUNCTION ---
export const getHospitalByName = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ name: req.params.name });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    res.json(hospital);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};