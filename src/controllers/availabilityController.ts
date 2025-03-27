export const createSlot = async (req: AuthenticatedRequest, res: Response) => {
    const { startTime, endTime } = req.body;
    const userId = req.userId;
  
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!startTime || !endTime) return res.status(400).json({ message: 'Start and end time are required.' });
  
    try {
      const newStart = new Date(startTime);
      const newEnd = new Date(endTime);
  
      const overlapping = await prisma.calendarSlot.findFirst({
        where: {
          userId,
          OR: [{ startTime: { lt: newEnd }, endTime: { gt: newStart } }],
        },
      });
  
      if (overlapping) return res.status(409).json({ message: 'Slot overlaps with an existing one.' });
  
      const slot = await prisma.calendarSlot.create({
        data: { userId, startTime: newStart, endTime: newEnd },
      });
  
      return res.status(201).json(slot);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to create slot.' });
    }
  };
  