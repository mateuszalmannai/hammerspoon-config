/**
 * Sample Data Manager
 * Provides pre-configured sample datasets for all decision-making tools
 * Enables users to quickly understand tool functionality with realistic examples
 */

class SampleDataManager {
    constructor() {
        // Generate unique IDs for sample data to avoid conflicts
        this.generateId = (prefix) => {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        };

        // Initialize sample data sets
        this.sampleSets = this._initializeSampleData();
    }

    /**
     * Get sample data for a specific tool and type
     * @param {string} toolName - Tool identifier (pmi, decision-matrix, etc.)
     * @param {string} type - Sample type ('technical' or 'everyday')
     * @returns {Object|null} Sample data object or null if not found
     */
    getSampleData(toolName, type = 'technical') {
        if (!this.sampleSets[toolName]) {
            console.error(`No sample data found for tool: ${toolName}`);
            return null;
        }

        if (!this.sampleSets[toolName][type]) {
            console.error(`No ${type} sample data found for tool: ${toolName}`);
            return null;
        }

        // Return deep copy to avoid mutations
        return JSON.parse(JSON.stringify(this.sampleSets[toolName][type]));
    }

    /**
     * Get available sample types for a tool
     * @param {string} toolName - Tool identifier
     * @returns {string[]} Array of available types
     */
    getAvailableTypes(toolName) {
        if (!this.sampleSets[toolName]) {
            return [];
        }
        return Object.keys(this.sampleSets[toolName]);
    }

    /**
     * Get metadata about a sample
     * @param {string} toolName - Tool identifier
     * @param {string} type - Sample type
     * @returns {Object|null} Metadata object
     */
    getSampleMetadata(toolName, type) {
        const sample = this.getSampleData(toolName, type);
        if (!sample) return null;

        return {
            title: sample.title || 'Sample Data',
            description: sample.description || '',
            itemCount: sample.itemCount || sample.data?.length || 0
        };
    }

    /**
     * Initialize all sample data sets
     * @private
     * @returns {Object} Complete sample data structure
     */
    _initializeSampleData() {
        return {
            'pmi': {
                technical: this._getPMITechnicalSample(),
                everyday: this._getPMIEverydaySample(),
                'edge-cases': this._getPMIEdgeCasesSample()
            },
            'decision-matrix': {
                technical: this._getDecisionMatrixTechnicalSample(),
                everyday: this._getDecisionMatrixEverydaySample(),
                'edge-cases': this._getDecisionMatrixEdgeCasesSample()
            },
            'eisenhower-matrix': {
                technical: this._getEisenhowerTechnicalSample(),
                everyday: this._getEisenhowerEverydaySample(),
                'edge-cases': this._getEisenhowerEdgeCasesSample()
            },
            'paired-comparison': {
                technical: this._getPairedComparisonTechnicalSample(),
                everyday: this._getPairedComparisonEverydaySample(),
                'edge-cases': this._getPairedComparisonEdgeCasesSample()
            },
            'pareto': {
                technical: this._getParetoTechnicalSample(),
                everyday: this._getParetoEverydaySample(),
                'edge-cases': this._getParetoEdgeCasesSample()
            },
            'risk-analysis': {
                technical: this._getRiskAnalysisTechnicalSample(),
                everyday: this._getRiskAnalysisEverydaySample(),
                'edge-cases': this._getRiskAnalysisEdgeCasesSample()
            },
            'cost-benefit': {
                technical: this._getCostBenefitTechnicalSample(),
                everyday: this._getCostBenefitEverydaySample()
            }
        };
    }

    // ==========================================
    // PMI Tool Sample Data
    // ==========================================

    _getPMITechnicalSample() {
        return {
            version: 1,
            appName: 'pmi-tool',
            title: 'Remote Work Decision',
            description: 'Evaluating the transition to fully remote work',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                // Plus items (5)
                { id: this.generateId('item'), text: 'Saves 2 hours daily on commute time', type: 'pro', weight: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Better work-life balance and flexibility', type: 'pro', weight: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Lower costs - no commute or work clothes expenses', type: 'pro', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Can work from anywhere with internet access', type: 'pro', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Fewer workplace distractions and interruptions', type: 'pro', weight: 3, createdAt: new Date().toISOString() },

                // Minus items (4)
                { id: this.generateId('item'), text: 'Social isolation and reduced team bonding', type: 'con', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Home distractions and blurred work-life boundaries', type: 'con', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Harder to collaborate and communicate spontaneously', type: 'con', weight: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Potential career advancement limitations', type: 'con', weight: 3, createdAt: new Date().toISOString() },

                // Interesting items (3)
                { id: this.generateId('item'), text: 'Requires strong self-discipline and time management skills', type: 'interesting', weight: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Need to invest in proper home office setup', type: 'interesting', weight: 2, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'May need to be more proactive about visibility and communication', type: 'interesting', weight: 2, createdAt: new Date().toISOString() }
            ]
        };
    }

    _getPMIEverydaySample() {
        return {
            version: 1,
            appName: 'pmi-tool',
            title: 'Getting a Dog',
            description: 'Deciding whether to adopt a dog',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                // Plus items (5)
                { id: this.generateId('item'), text: 'Constant companionship and unconditional love', type: 'pro', weight: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Motivation to exercise and stay active daily', type: 'pro', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Added home security and alert system', type: 'pro', weight: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Teaches responsibility and creates routine', type: 'pro', weight: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Great conversation starter and social opportunities', type: 'pro', weight: 2, createdAt: new Date().toISOString() },

                // Minus items (4)
                { id: this.generateId('item'), text: 'Significant ongoing costs (food, vet bills, supplies)', type: 'con', weight: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Major time commitment for walks, training, and care', type: 'con', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Limits spontaneous travel and overnight trips', type: 'con', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Cleaning up after messes, shedding, and accidents', type: 'con', weight: 3, createdAt: new Date().toISOString() },

                // Interesting items (3)
                { id: this.generateId('item'), text: 'Complete lifestyle change with new daily routines', type: 'interesting', weight: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Need to dog-proof home and secure yard area', type: 'interesting', weight: 2, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Different breeds have vastly different needs and temperaments', type: 'interesting', weight: 2, createdAt: new Date().toISOString() }
            ]
        };
    }

    // ==========================================
    // Decision Matrix Tool Sample Data
    // ==========================================

    _getDecisionMatrixTechnicalSample() {
        const criteriaIds = [
            this.generateId('crit'),
            this.generateId('crit'),
            this.generateId('crit'),
            this.generateId('crit')
        ];

        const optionIds = [
            this.generateId('opt'),
            this.generateId('opt'),
            this.generateId('opt'),
            this.generateId('opt')
        ];

        return {
            version: 1,
            appName: 'decision-matrix',
            title: 'Cloud Provider Selection',
            description: 'Evaluating cloud infrastructure providers',
            itemCount: 1,
            exportDate: new Date().toISOString(),
            data: [{
                criteria: [
                    { id: criteriaIds[0], name: 'Cost Efficiency', weight: 9, createdAt: new Date().toISOString() },
                    { id: criteriaIds[1], name: 'Performance & Speed', weight: 8, createdAt: new Date().toISOString() },
                    { id: criteriaIds[2], name: 'Developer Experience', weight: 7, createdAt: new Date().toISOString() },
                    { id: criteriaIds[3], name: 'Support & Documentation', weight: 6, createdAt: new Date().toISOString() }
                ],
                options: [
                    { id: optionIds[0], name: 'AWS', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[1], name: 'Google Cloud', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[2], name: 'Azure', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[3], name: 'DigitalOcean', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() }
                ],
                scores: {
                    [optionIds[0]]: { [criteriaIds[0]]: 7, [criteriaIds[1]]: 9, [criteriaIds[2]]: 7, [criteriaIds[3]]: 9 },
                    [optionIds[1]]: { [criteriaIds[0]]: 8, [criteriaIds[1]]: 9, [criteriaIds[2]]: 8, [criteriaIds[3]]: 8 },
                    [optionIds[2]]: { [criteriaIds[0]]: 7, [criteriaIds[1]]: 8, [criteriaIds[2]]: 9, [criteriaIds[3]]: 8 },
                    [optionIds[3]]: { [criteriaIds[0]]: 9, [criteriaIds[1]]: 7, [criteriaIds[2]]: 8, [criteriaIds[3]]: 7 }
                }
            }]
        };
    }

    _getDecisionMatrixEverydaySample() {
        const criteriaIds = [
            this.generateId('crit'),
            this.generateId('crit'),
            this.generateId('crit'),
            this.generateId('crit')
        ];

        const optionIds = [
            this.generateId('opt'),
            this.generateId('opt'),
            this.generateId('opt'),
            this.generateId('opt')
        ];

        return {
            version: 1,
            appName: 'decision-matrix',
            title: 'Choosing a New Car',
            description: 'Evaluating different vehicle options',
            itemCount: 1,
            exportDate: new Date().toISOString(),
            data: [{
                criteria: [
                    { id: criteriaIds[0], name: 'Price & Value', weight: 10, createdAt: new Date().toISOString() },
                    { id: criteriaIds[1], name: 'Fuel Efficiency', weight: 8, createdAt: new Date().toISOString() },
                    { id: criteriaIds[2], name: 'Safety Features', weight: 9, createdAt: new Date().toISOString() },
                    { id: criteriaIds[3], name: 'Cargo Space', weight: 6, createdAt: new Date().toISOString() }
                ],
                options: [
                    { id: optionIds[0], name: 'Honda CR-V', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[1], name: 'Toyota RAV4', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[2], name: 'Mazda CX-5', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[3], name: 'Subaru Forester', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() }
                ],
                scores: {
                    [optionIds[0]]: { [criteriaIds[0]]: 8, [criteriaIds[1]]: 8, [criteriaIds[2]]: 9, [criteriaIds[3]]: 8 },
                    [optionIds[1]]: { [criteriaIds[0]]: 7, [criteriaIds[1]]: 9, [criteriaIds[2]]: 9, [criteriaIds[3]]: 7 },
                    [optionIds[2]]: { [criteriaIds[0]]: 8, [criteriaIds[1]]: 7, [criteriaIds[2]]: 8, [criteriaIds[3]]: 6 },
                    [optionIds[3]]: { [criteriaIds[0]]: 7, [criteriaIds[1]]: 7, [criteriaIds[2]]: 9, [criteriaIds[3]]: 9 }
                }
            }]
        };
    }

    // ==========================================
    // Eisenhower Matrix Tool Sample Data
    // ==========================================

    _getEisenhowerTechnicalSample() {
        return {
            version: 1,
            appName: 'eisenhower-matrix',
            title: 'Project Manager Tasks',
            description: 'Weekly task prioritization',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                // Do First (Urgent & Important)
                { id: this.generateId('task'), text: 'Fix critical production bug affecting customers', quadrant: 'do-first', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Prepare for client presentation tomorrow', quadrant: 'do-first', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Complete sprint planning for Monday', quadrant: 'do-first', createdAt: new Date().toISOString() },

                // Schedule (Not Urgent but Important)
                { id: this.generateId('task'), text: 'Review and update team documentation', quadrant: 'schedule', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Conduct quarterly performance reviews', quadrant: 'schedule', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Plan technical debt reduction strategy', quadrant: 'schedule', createdAt: new Date().toISOString() },

                // Delegate (Urgent but Not Important)
                { id: this.generateId('task'), text: 'Respond to non-critical support tickets', quadrant: 'delegate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Update project status in tracking system', quadrant: 'delegate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Schedule next month\'s team meetings', quadrant: 'delegate', createdAt: new Date().toISOString() },

                // Eliminate (Not Urgent, Not Important)
                { id: this.generateId('task'), text: 'Browse new development tools and frameworks', quadrant: 'eliminate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Read all company-wide announcement emails', quadrant: 'eliminate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Attend optional non-relevant meetings', quadrant: 'eliminate', createdAt: new Date().toISOString() }
            ]
        };
    }

    _getEisenhowerEverydaySample() {
        return {
            version: 1,
            appName: 'eisenhower-matrix',
            title: 'Personal Life Tasks',
            description: 'Weekend and life priorities',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                // Do First
                { id: this.generateId('task'), text: 'Pay overdue credit card bill today', quadrant: 'do-first', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Pick up prescription medication', quadrant: 'do-first', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Prepare for job interview tomorrow', quadrant: 'do-first', createdAt: new Date().toISOString() },

                // Schedule
                { id: this.generateId('task'), text: 'Schedule annual health checkup', quadrant: 'schedule', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Plan friend\'s birthday party next month', quadrant: 'schedule', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Research and book summer vacation', quadrant: 'schedule', createdAt: new Date().toISOString() },

                // Delegate
                { id: this.generateId('task'), text: 'Get car washed and detailed', quadrant: 'delegate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Drop off dry cleaning', quadrant: 'delegate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Schedule home cleaning service', quadrant: 'delegate', createdAt: new Date().toISOString() },

                // Eliminate
                { id: this.generateId('task'), text: 'Organize old photos from 5 years ago', quadrant: 'eliminate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Watch all shows in Netflix queue', quadrant: 'eliminate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Browse social media mindlessly', quadrant: 'eliminate', createdAt: new Date().toISOString() }
            ]
        };
    }

    // ==========================================
    // Paired Comparison Tool Sample Data
    // ==========================================

    _getPairedComparisonTechnicalSample() {
        return {
            version: 1,
            appName: 'paired-comparison',
            title: 'Programming Languages',
            description: 'Comparing languages for next project',
            totalOptions: 6,
            totalComparisons: 15,
            completedComparisons: 15,
            hasCompletedResults: true,
            exportDate: new Date().toISOString(),
            data: [
                { id: this.generateId('opt'), name: 'Python', wins: 4, losses: 1, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'JavaScript', wins: 4, losses: 1, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'TypeScript', wins: 3, losses: 2, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Java', wins: 2, losses: 3, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Go', wins: 1, losses: 4, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Rust', wins: 1, losses: 4, comparisons: 5, createdAt: new Date().toISOString() }
            ]
        };
    }

    _getPairedComparisonEverydaySample() {
        return {
            version: 1,
            appName: 'paired-comparison',
            title: 'Vacation Destinations',
            description: 'Choosing where to go on vacation',
            totalOptions: 6,
            totalComparisons: 15,
            completedComparisons: 15,
            hasCompletedResults: true,
            exportDate: new Date().toISOString(),
            data: [
                { id: this.generateId('opt'), name: 'Tropical Beach Resort', wins: 5, losses: 0, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Mountain Hiking Adventure', wins: 3, losses: 2, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'European City Tour', wins: 3, losses: 2, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Countryside Retreat', wins: 2, losses: 3, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Theme Park Experience', wins: 1, losses: 4, comparisons: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Cultural Heritage Sites', wins: 1, losses: 4, comparisons: 5, createdAt: new Date().toISOString() }
            ]
        };
    }

    // ==========================================
    // Pareto Analysis Tool Sample Data
    // ==========================================

    _getParetoTechnicalSample() {
        return {
            version: 1,
            appName: 'pareto-analysis',
            title: 'Customer Support Issues',
            description: 'Analyzing support ticket categories',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                { id: this.generateId('item'), group: 'Login & Authentication', description: 'Password reset requests', impact: 45, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Login & Authentication', description: 'Two-factor authentication issues', impact: 35, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Payment Processing', description: 'Failed payment transactions', impact: 40, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Payment Processing', description: 'Invoice and billing questions', impact: 25, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'User Interface', description: 'Navigation confusion', impact: 30, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'User Interface', description: 'Mobile app crashes', impact: 50, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Data Import/Export', description: 'CSV import formatting errors', impact: 20, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Data Import/Export', description: 'Large file upload failures', impact: 15, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Email Notifications', description: 'Emails not being received', impact: 18, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Email Notifications', description: 'Unsubscribe not working', impact: 8, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'API Integration', description: 'API rate limit errors', impact: 12, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'API Integration', description: 'Webhook delivery failures', impact: 10, createdAt: new Date().toISOString() }
            ]
        };
    }

    _getParetoEverydaySample() {
        return {
            version: 1,
            appName: 'pareto-analysis',
            title: 'Household Time Wasters',
            description: 'Identifying biggest time drains at home',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                { id: this.generateId('item'), group: 'Social Media', description: 'Scrolling Instagram and TikTok', impact: 60, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Social Media', description: 'Checking Facebook notifications', impact: 30, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Entertainment', description: 'Binge-watching streaming shows', impact: 50, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Entertainment', description: 'Playing mobile games', impact: 25, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Daily Chores', description: 'Cooking elaborate meals every night', impact: 40, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Daily Chores', description: 'Excessive cleaning and organizing', impact: 20, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Shopping', description: 'Online shopping and browsing', impact: 35, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Shopping', description: 'Comparing prices endlessly', impact: 15, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Communication', description: 'Unnecessary group chat messages', impact: 18, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Communication', description: 'Long phone conversations', impact: 22, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Planning', description: 'Over-planning minor events', impact: 12, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Planning', description: 'Making too many to-do lists', impact: 10, createdAt: new Date().toISOString() }
            ]
        };
    }

    // ==========================================
    // Risk Analysis Tool Sample Data
    // ==========================================

    _getRiskAnalysisTechnicalSample() {
        return {
            version: 1,
            appName: 'risk-analysis',
            title: 'Software Project Risks',
            description: 'Analyzing risks for new application launch',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                { id: this.generateId('risk'), description: 'Database performance issues at scale', probability: 4, impact: 5, mitigation: 'Load testing and optimization', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Third-party API becoming unavailable', probability: 3, impact: 5, mitigation: 'Implement fallback and caching', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Security vulnerability discovered post-launch', probability: 4, impact: 5, mitigation: 'Regular security audits and penetration testing', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Key developer leaves during critical phase', probability: 3, impact: 4, mitigation: 'Cross-training and documentation', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Scope creep delaying timeline', probability: 5, impact: 3, mitigation: 'Strict change control process', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Browser compatibility issues', probability: 4, impact: 3, mitigation: 'Comprehensive cross-browser testing', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Infrastructure costs exceed budget', probability: 3, impact: 3, mitigation: 'Monitor usage and implement auto-scaling', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'User adoption lower than expected', probability: 4, impact: 4, mitigation: 'User research and beta testing program', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Data migration errors', probability: 3, impact: 4, mitigation: 'Multiple staging environments and rollback plan', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Mobile app store rejection', probability: 2, impact: 4, mitigation: 'Follow guidelines strictly and pre-submission review', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Dependency library becomes deprecated', probability: 3, impact: 2, mitigation: 'Regular dependency audits and updates', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Documentation incomplete at launch', probability: 4, impact: 2, mitigation: 'Documentation as part of definition of done', createdAt: new Date().toISOString() }
            ]
        };
    }

    _getRiskAnalysisEverydaySample() {
        return {
            version: 1,
            appName: 'risk-analysis',
            title: 'Road Trip Planning',
            description: 'Assessing risks for cross-country road trip',
            itemCount: 12,
            exportDate: new Date().toISOString(),
            data: [
                { id: this.generateId('risk'), description: 'Car breakdown in remote area', probability: 3, impact: 5, mitigation: 'Pre-trip mechanic checkup and AAA membership', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Severe weather delays travel', probability: 4, impact: 3, mitigation: 'Flexible schedule and weather monitoring app', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Accommodation booking gets cancelled', probability: 2, impact: 4, mitigation: 'Confirmed reservations and backup options', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Running over budget', probability: 4, impact: 3, mitigation: 'Detailed budget planning and emergency fund', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Someone gets sick during trip', probability: 3, impact: 4, mitigation: 'Travel insurance and first aid kit', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Traffic causes major delays', probability: 5, impact: 2, mitigation: 'Use real-time traffic apps and alternate routes', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Lost or stolen luggage', probability: 2, impact: 3, mitigation: 'Keep valuables in carry-on, travel insurance', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Flat tire on highway', probability: 3, impact: 3, mitigation: 'Check tire condition, carry spare and tools', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Credit card fraud while traveling', probability: 2, impact: 4, mitigation: 'Notify bank, monitor transactions daily', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Attraction closed on arrival', probability: 3, impact: 2, mitigation: 'Check hours and holidays in advance', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Phone battery dies with no charger', probability: 4, impact: 2, mitigation: 'Portable battery pack and car charger', createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Forgetting essential items', probability: 4, impact: 2, mitigation: 'Comprehensive packing checklist', createdAt: new Date().toISOString() }
            ]
        };
    }

    // ==========================================
    // Edge Case Sample Data (for testing)
    // ==========================================

    _getPMIEdgeCasesSample() {
        return {
            version: 1,
            appName: 'pmi-tool',
            title: 'Edge Cases Test Data',
            description: 'Testing special characters, Unicode, and long text',
            itemCount: 9,
            exportDate: new Date().toISOString(),
            data: [
                // Special characters
                { id: this.generateId('item'), text: 'Test with "quotes" and \'apostrophes\' & ampersands', type: 'pro', weight: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'HTML entities: <script>alert("xss")</script> should be escaped', type: 'pro', weight: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'CSV special: field,with,commas "and quotes"', type: 'pro', weight: 4, createdAt: new Date().toISOString() },

                // Unicode and emojis
                { id: this.generateId('item'), text: '日本語テスト - Japanese text test 🎌', type: 'con', weight: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Emoji test: 🚀 💡 ⚠️ ✅ ❌ 🎯 📊 🔥', type: 'con', weight: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Ελληνικά • العربية • עברית • 한국어 • 中文', type: 'con', weight: 2, createdAt: new Date().toISOString() },

                // Long text
                { id: this.generateId('item'), text: 'This is a very long text item that tests how the UI handles content that exceeds normal length expectations. It should wrap properly and not break the layout. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.', type: 'interesting', weight: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'Superlongwordwithnospacestotestwordbreakingbehaviorintheinterfacewhichshouldhandlethisgracefully', type: 'interesting', weight: 2, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), text: 'A', type: 'interesting', weight: 1, createdAt: new Date().toISOString() }
            ]
        };
    }

    _getDecisionMatrixEdgeCasesSample() {
        const criteriaIds = [
            this.generateId('crit'),
            this.generateId('crit'),
            this.generateId('crit')
        ];

        const optionIds = [
            this.generateId('opt'),
            this.generateId('opt'),
            this.generateId('opt')
        ];

        return {
            version: 1,
            appName: 'decision-matrix',
            title: 'Edge Cases: "Special" & <Test> Data 🧪',
            description: 'Testing special characters and Unicode in matrix',
            itemCount: 1,
            exportDate: new Date().toISOString(),
            data: [{
                criteria: [
                    { id: criteriaIds[0], name: 'Criteria with "quotes" & symbols <>', weight: 10, createdAt: new Date().toISOString() },
                    { id: criteriaIds[1], name: '日本語クライテリア 🎯', weight: 5, createdAt: new Date().toISOString() },
                    { id: criteriaIds[2], name: 'VeryLongCriteriaNameThatShouldWrapOrTruncateProperlyInTheUI', weight: 1, createdAt: new Date().toISOString() }
                ],
                options: [
                    { id: optionIds[0], name: 'Option "A" with <special> chars', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[1], name: '選択肢B 🚀 émojis & ünïcödé', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() },
                    { id: optionIds[2], name: 'X', totalScore: 0, weightedScore: 0, createdAt: new Date().toISOString() }
                ],
                scores: {
                    [optionIds[0]]: { [criteriaIds[0]]: 10, [criteriaIds[1]]: 5, [criteriaIds[2]]: 1 },
                    [optionIds[1]]: { [criteriaIds[0]]: 1, [criteriaIds[1]]: 10, [criteriaIds[2]]: 5 },
                    [optionIds[2]]: { [criteriaIds[0]]: 5, [criteriaIds[1]]: 1, [criteriaIds[2]]: 10 }
                }
            }]
        };
    }

    _getEisenhowerEdgeCasesSample() {
        return {
            version: 1,
            appName: 'eisenhower-matrix',
            title: 'Edge Cases Test 🧪',
            description: 'Testing special characters, Unicode, and boundary conditions',
            itemCount: 8,
            exportDate: new Date().toISOString(),
            data: [
                // Special characters
                { id: this.generateId('task'), text: 'Task with "double quotes" and \'single quotes\'', quadrant: 'do-first', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'HTML test: <b>bold</b> & <script>alert(1)</script>', quadrant: 'do-first', createdAt: new Date().toISOString() },

                // Unicode
                { id: this.generateId('task'), text: '重要なタスク - Important task in Japanese 📌', quadrant: 'schedule', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Tâche avec accénts et çédilles 🇫🇷', quadrant: 'schedule', createdAt: new Date().toISOString() },

                // Long text
                { id: this.generateId('task'), text: 'This is an extremely long task description that tests how the Eisenhower Matrix handles overflow content. It should either wrap to multiple lines or truncate with an ellipsis depending on the CSS implementation.', quadrant: 'delegate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: 'Averylongsinglewordtaskwithnospaces', quadrant: 'delegate', createdAt: new Date().toISOString() },

                // Minimal
                { id: this.generateId('task'), text: 'X', quadrant: 'eliminate', createdAt: new Date().toISOString() },
                { id: this.generateId('task'), text: '🔥', quadrant: 'eliminate', createdAt: new Date().toISOString() }
            ]
        };
    }

    _getPairedComparisonEdgeCasesSample() {
        return {
            version: 1,
            appName: 'paired-comparison',
            title: 'Edge Cases "Test" 🧪',
            description: 'Testing special characters and Unicode',
            totalOptions: 5,
            totalComparisons: 10,
            completedComparisons: 10,
            hasCompletedResults: true,
            exportDate: new Date().toISOString(),
            data: [
                { id: this.generateId('opt'), name: 'Option with "quotes" & <brackets>', wins: 4, losses: 0, comparisons: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: '日本語オプション 🎌', wins: 3, losses: 1, comparisons: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'Émojis: 🚀💡⚡🎯', wins: 2, losses: 2, comparisons: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'VeryLongOptionNameThatShouldBeHandledGracefullyByTheUI', wins: 1, losses: 3, comparisons: 4, createdAt: new Date().toISOString() },
                { id: this.generateId('opt'), name: 'A', wins: 0, losses: 4, comparisons: 4, createdAt: new Date().toISOString() }
            ]
        };
    }

    _getParetoEdgeCasesSample() {
        return {
            version: 1,
            appName: 'pareto-analysis',
            title: 'Edge Cases "Test" & <Data> 🧪',
            description: 'Testing special characters, Unicode, and long text',
            itemCount: 8,
            exportDate: new Date().toISOString(),
            data: [
                // Group with special characters
                { id: this.generateId('grp'), type: 'group', name: 'Group "A" with <special> & chars', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Group "A" with <special> & chars', description: 'Item with "quotes"', impact: 50, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: 'Group "A" with <special> & chars', description: 'CSV test: value,with,commas', impact: 30, createdAt: new Date().toISOString() },

                // Unicode group
                { id: this.generateId('grp'), type: 'group', name: '日本語グループ 🎌', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: '日本語グループ 🎌', description: '日本語の項目 - Japanese item', impact: 45, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), group: '日本語グループ 🎌', description: 'Émojis: 🚀💡⚡🎯✅❌', impact: 25, createdAt: new Date().toISOString() },

                // Long text
                { id: this.generateId('item'), description: 'This is a very long item description that tests how the Pareto Analysis tool handles overflow content. It should wrap properly and not break the layout of the analysis view.', impact: 40, createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'X', impact: 5, createdAt: new Date().toISOString() }
            ]
        };
    }

    _getRiskAnalysisEdgeCasesSample() {
        return {
            version: 1,
            appName: 'risk-analysis',
            title: 'Edge Cases "Test" 🧪',
            description: 'Testing special characters, Unicode, and boundary conditions',
            itemCount: 8,
            exportDate: new Date().toISOString(),
            data: [
                // Special characters - Critical quadrant (P>=4, I>=4)
                { id: this.generateId('risk'), description: 'Risk with "double quotes" & <angle brackets>', probability: 5, impact: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'HTML: <script>alert("xss")</script> test', probability: 4, impact: 4, createdAt: new Date().toISOString() },

                // Unicode - Monitor quadrant (P<4, I>=4)
                { id: this.generateId('risk'), description: '危険なリスク - Dangerous risk in Japanese 🎌', probability: 3, impact: 5, createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Risque avec émojis: 🚨⚠️🔥💥', probability: 2, impact: 4, createdAt: new Date().toISOString() },

                // Long text - Mitigate quadrant (P>=4, I<4)
                { id: this.generateId('risk'), description: 'This is an extremely long risk description that tests how the Risk Analysis tool handles overflow content in the risk matrix quadrants. It should either wrap properly or truncate with an indication that there is more text.', probability: 5, impact: 3, createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: 'Averylongsinglewordwithnospaces', probability: 4, impact: 2, createdAt: new Date().toISOString() },

                // Minimal - Accept quadrant (P<4, I<4)
                { id: this.generateId('risk'), description: 'X', probability: 1, impact: 1, createdAt: new Date().toISOString() },
                { id: this.generateId('risk'), description: '🔥', probability: 2, impact: 2, createdAt: new Date().toISOString() }
            ]
        };
    }

    // ==========================================
    // Cost-Benefit Analysis Tool Sample Data
    // ==========================================

    _getCostBenefitTechnicalSample() {
        return {
            version: 1,
            appName: 'cost-benefit',
            title: 'Software License Purchase',
            description: 'Evaluating enterprise software license investment',
            itemCount: 10,
            exportDate: new Date().toISOString(),
            data: [
                // One-time costs
                { id: this.generateId('item'), description: 'Software license purchase (perpetual)', type: 'cost', category: 'one-time', amount: 25000, frequency: 'yearly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Implementation and setup costs', type: 'cost', category: 'one-time', amount: 8000, frequency: 'yearly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Team training and onboarding', type: 'cost', category: 'one-time', amount: 5000, frequency: 'yearly', createdAt: new Date().toISOString() },

                // Recurring costs
                { id: this.generateId('item'), description: 'Annual maintenance and support', type: 'cost', category: 'recurring', amount: 5000, frequency: 'yearly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Cloud hosting fees', type: 'cost', category: 'recurring', amount: 500, frequency: 'monthly', createdAt: new Date().toISOString() },

                // One-time benefits
                { id: this.generateId('item'), description: 'Elimination of legacy system costs', type: 'benefit', category: 'one-time', amount: 15000, frequency: 'yearly', createdAt: new Date().toISOString() },

                // Recurring benefits
                { id: this.generateId('item'), description: 'Developer productivity increase (20% time savings)', type: 'benefit', category: 'recurring', amount: 4000, frequency: 'monthly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Reduced manual error correction', type: 'benefit', category: 'recurring', amount: 1500, frequency: 'monthly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Faster deployment cycles revenue', type: 'benefit', category: 'recurring', amount: 2500, frequency: 'monthly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Customer satisfaction improvement', type: 'benefit', category: 'recurring', amount: 1000, frequency: 'monthly', createdAt: new Date().toISOString() }
            ]
        };
    }

    _getCostBenefitEverydaySample() {
        return {
            version: 1,
            appName: 'cost-benefit',
            title: 'Home Solar Panel Installation',
            description: 'Evaluating residential solar panel investment',
            itemCount: 10,
            exportDate: new Date().toISOString(),
            data: [
                // One-time costs
                { id: this.generateId('item'), description: 'Solar panel system purchase', type: 'cost', category: 'one-time', amount: 18000, frequency: 'yearly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Installation labor costs', type: 'cost', category: 'one-time', amount: 4000, frequency: 'yearly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Electrical panel upgrade', type: 'cost', category: 'one-time', amount: 2000, frequency: 'yearly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Permits and inspections', type: 'cost', category: 'one-time', amount: 500, frequency: 'yearly', createdAt: new Date().toISOString() },

                // Recurring costs
                { id: this.generateId('item'), description: 'Annual maintenance and cleaning', type: 'cost', category: 'recurring', amount: 200, frequency: 'yearly', createdAt: new Date().toISOString() },

                // One-time benefits
                { id: this.generateId('item'), description: 'Federal tax credit (30%)', type: 'benefit', category: 'one-time', amount: 7200, frequency: 'yearly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'State rebate program', type: 'benefit', category: 'one-time', amount: 2000, frequency: 'yearly', createdAt: new Date().toISOString() },

                // Recurring benefits
                { id: this.generateId('item'), description: 'Electricity bill savings', type: 'benefit', category: 'recurring', amount: 250, frequency: 'monthly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Net metering credits (excess power)', type: 'benefit', category: 'recurring', amount: 50, frequency: 'monthly', createdAt: new Date().toISOString() },
                { id: this.generateId('item'), description: 'Increased home value', type: 'benefit', category: 'one-time', amount: 10000, frequency: 'yearly', createdAt: new Date().toISOString() }
            ]
        };
    }
}
