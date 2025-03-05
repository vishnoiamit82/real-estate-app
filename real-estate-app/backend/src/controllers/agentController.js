const createAgent = async (req, res) => {
    try {
        const { name, email, phoneNumber } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required.' });
        }

        const newAgent = new Agent({
            name,
            email: email || null, // Default to null if not provided
            phoneNumber: phoneNumber || null, // Default to null if not provided
        });

        await newAgent.save();
        res.status(201).json(newAgent);
    } catch (error) {
        res.status(500).json({ message: 'Error creating agent.', error });
    }
};
