import Queue from '../models/queue.model.js';

export const getQueueStatus = async (req, res) => {
  const { hospitalId } = req.params;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const queue = await Queue.findOne({ hospitalId, date: today });

    if (!queue) {
      return res.status(404).json({ message: 'No active queue found for today' });
    }

    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};

export const advanceQueue = async (req, res) => {
  // In a real app, you'd add role-based access control here
  const { queueId } = req.params;
  try {
    const queue = await Queue.findById(queueId);
    if (!queue) {
      return res.status(404).json({ message: 'Queue not found' });
    }

    queue.currentNumber += 1;
    await queue.save();

    // Get the socket.io instance and emit the update
    const io = req.app.get('socketio');
    const roomId = `queue_${queue.hospitalId}`;
    io.to(roomId).emit('queue-update', {
      currentNumber: queue.currentNumber,
    });

    res.json({ message: 'Queue advanced', queue });
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};