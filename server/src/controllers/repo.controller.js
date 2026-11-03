import Project from '../models/Project.model.js';
import Report from '../models/Report.model.js';
import { fetchRepoDataFromGitHub } from '../services/githubService.js';
import { anonymizeData } from '../services/anonymize.js';
import { analyzeWithGemini } from '../services/geminiService.js';
import { ErrorHandler } from '../utils/errorHandler.js';

export const analyzeRepository = async (req, res, next) => {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl) {
            return next(new ErrorHandler('GitHub repository URL is required.', 400));
        }

        const trimmedUrl = repoUrl.trim();

        // 1. Check if cached report/project exists within 24 hours
        const existingProject = await Project.findOne({ repoUrl: trimmedUrl });

        if (existingProject) {
            const existingReport = await Report.findOne({ projectId: existingProject._id });
            if (existingReport) {
                return res.status(200).json({
                    success: true,
                    message: 'Retrieved cached handover report successfully (within 24 hours).',
                    source: 'cache',
                    data: {
                        project: existingProject,
                        report: existingReport
                    }
                });
            }
        }

        // 2. Fetch raw data from GitHub
        const githubData = await fetchRepoDataFromGitHub(trimmedUrl);

        // 3. Anonymize sensitive data (commits & file tree)
        const { cleanedCommits, cleanedFiles } = anonymizeData(
            githubData.commits,
            githubData.fileTree
        );

        // 4. Save or update Project in DB (TTL index handles 24h expiration automatically)
        const projectRecord = await Project.findOneAndUpdate(
            { repoUrl: trimmedUrl },
            {
                repoUrl: trimmedUrl,
                owner: githubData.owner,
                repoName: githubData.repoName,
                anonymizedStructure: cleanedFiles,
                commitLogs: cleanedCommits,
                createdAt: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 5. Analyze with Gemini AI
        const aiAnalysisResult = await analyzeWithGemini(cleanedCommits, cleanedFiles);

        // 6. Save Report in DB
        const reportRecord = await Report.create({
            projectId: projectRecord._id,
            repoUrl: trimmedUrl,
            completionPercentage: aiAnalysisResult.completionPercentage,
            projectSummary: aiAnalysisResult.projectSummary,
            completedTasks: aiAnalysisResult.completedTasks,
            pendingTasks: aiAnalysisResult.pendingTasks,
            moduleBreakdown: aiAnalysisResult.moduleBreakdown,
            identifiedRisks: aiAnalysisResult.identifiedRisks,
            recommendations: aiAnalysisResult.recommendations,
            testingStatus: aiAnalysisResult.testingStatus,
            documentationStatus: aiAnalysisResult.documentationStatus,
            deploymentStatus: aiAnalysisResult.deploymentStatus
        });

        return res.status(201).json({
            success: true,
            message: 'Repository analyzed and handover report generated successfully.',
            source: 'fresh-ai',
            data: {
                project: projectRecord,
                report: reportRecord
            }
        });

    } catch (error) {
        next(error);
    }
};
