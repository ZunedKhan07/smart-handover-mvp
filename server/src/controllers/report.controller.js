import Report from '../models/Report.model.js';
import { ErrorHandler } from '../utils/errorHandler.js';

export const getReportById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const report = await Report.findById(id).populate('projectId');

        if (!report) {
            return next(new ErrorHandler('Handover report not found.', 404));
        }

        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        next(error);
    }
};

export const updateReportApproval = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { isApproved } = req.body;

        const report = await Report.findById(id);

        if (!report) {
            return next(new ErrorHandler('Handover report not found.', 404));
        }

        report.isApproved = typeof isApproved === 'boolean' ? isApproved : report.isApproved;
        await report.save();

        return res.status(200).json({
            success: true,
            message: 'Report approval status updated successfully.',
            data: report
        });
    } catch (error) {
        next(error);
    }
};