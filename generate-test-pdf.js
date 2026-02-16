const fs = require('fs');
const PDFDocument = require('pdfkit');

// Create a document
const doc = new PDFDocument({
  margins: { top: 50, bottom: 50, left: 50, right: 50 }
});

// Pipe to a file
doc.pipe(fs.createWriteStream('test-decisions.pdf'));

// Add content
doc.fontSize(20)
   .font('Helvetica-Bold')
   .text('DECISION DOCUMENT', { align: 'center' })
   .fontSize(14)
   .text('Q1 2026 Strategic Decisions', { align: 'center' })
   .moveDown(2);

// Decision 1
doc.fontSize(16)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Decision 1: Migrate to Microservices Architecture')
   .moveDown(0.5);

doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#000000')
   .text('Decision Date: 2026-02-10 | Status: Active | Category: Technical Architecture | Priority: High')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Description:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('We have decided to migrate our monolithic application to a microservices architecture to improve scalability, enable independent deployments, and allow teams to work autonomously on different services.')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Key Assumptions:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• Team members have sufficient knowledge of containerization (Docker/Kubernetes) - Confidence: Medium')
   .text('• Current infrastructure can support the additional overhead of microservices - Confidence: High')
   .text('• Migration can be completed within 6 months without disrupting existing services - Confidence: Low')
   .text('• The benefits of microservices will outweigh the increased operational complexity - Confidence: Medium')
   .text('• All critical dependencies have been identified and documented - Confidence: High')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Expected Outcomes:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• 50% reduction in deployment time')
   .text('• Improved system resilience')
   .text('• Better team autonomy')
   .moveDown(2);

// Decision 2
doc.fontSize(16)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Decision 2: Implement AI-Powered Customer Support')
   .moveDown(0.5);

doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#000000')
   .text('Decision Date: 2026-02-15 | Status: Active | Category: Customer Experience | Priority: High')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Description:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('Deploy an AI chatbot to handle tier-1 customer support inquiries, reducing response times and allowing human agents to focus on complex issues.')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Key Assumptions:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• AI can accurately handle 70% of incoming support tickets - Confidence: High')
   .text('• Customers will be receptive to AI-powered support - Confidence: Medium')
   .text('• Integration with existing CRM system will be straightforward - Confidence: Medium')
   .text('• Training data quality is sufficient for accurate responses - Confidence: High')
   .text('• ROI will be positive within 12 months - Confidence: Medium')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Expected Outcomes:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• 60% reduction in average response time')
   .text('• 30% cost savings in support operations')
   .text('• Improved customer satisfaction scores')
   .moveDown(2);

// Decision 3
doc.addPage();
doc.fontSize(16)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Decision 3: Expand to European Market')
   .moveDown(0.5);

doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#000000')
   .text('Decision Date: 2026-02-12 | Status: Under Review | Category: Business Strategy | Priority: Critical')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Description:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('Launch operations in 5 European countries (Germany, France, UK, Spain, Italy) to diversify revenue streams and reduce dependency on the North American market.')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Key Assumptions:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• GDPR compliance can be achieved within current timeline - Confidence: High')
   .text('• Market demand in Europe is comparable to North America - Confidence: Medium')
   .text('• Local partnerships can be established within 3 months - Confidence: Low')
   .text('• Exchange rate fluctuations won\'t significantly impact profitability - Confidence: Medium')
   .text('• Current product offerings will resonate with European customers - Confidence: Medium')
   .text('• Legal and regulatory requirements are fully understood - Confidence: High')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Expected Outcomes:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• 40% increase in total revenue within 18 months')
   .text('• Geographic risk diversification')
   .text('• Enhanced brand recognition globally')
   .moveDown(2);

// Decision 4
doc.fontSize(16)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Decision 4: Adopt Remote-First Work Policy')
   .moveDown(0.5);

doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#000000')
   .text('Decision Date: 2026-01-20 | Status: Active | Category: HR & Culture | Priority: Medium')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Description:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('Transition to a permanent remote-first work model, closing physical offices except for small collaboration spaces.')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Key Assumptions:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• Productivity will remain stable or improve with remote work - Confidence: High')
   .text('• Company culture can be maintained virtually - Confidence: Medium')
   .text('• All employees have adequate home office setups - Confidence: Medium')
   .text('• Communication tools are sufficient for collaboration needs - Confidence: High')
   .text('• Time zone differences won\'t significantly impact team coordination - Confidence: Low')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Expected Outcomes:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• $2M annual savings in office expenses')
   .text('• Access to global talent pool')
   .text('• Improved employee satisfaction')
   .moveDown(2);

// Decision 5
doc.addPage();
doc.fontSize(16)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Decision 5: Invest in Cybersecurity Infrastructure')
   .moveDown(0.5);

doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#000000')
   .text('Decision Date: 2026-02-08 | Status: Active | Category: Security & Compliance | Priority: Critical')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Description:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('Allocate $5M to upgrade cybersecurity infrastructure including zero-trust architecture, advanced threat detection, and security training programs.')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Key Assumptions:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• Current vulnerabilities have been accurately identified - Confidence: High')
   .text('• Budget allocation is sufficient for comprehensive upgrade - Confidence: Medium')
   .text('• Implementation won\'t disrupt ongoing operations - Confidence: Medium')
   .text('• Threat landscape will remain relatively stable during implementation - Confidence: Low')
   .text('• Security team has capacity to manage new systems - Confidence: High')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Expected Outcomes:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• 90% reduction in security incidents')
   .text('• Compliance with SOC 2 Type II requirements')
   .text('• Enhanced customer trust')
   .moveDown(2);

// Decision 6
doc.fontSize(16)
   .font('Helvetica-Bold')
   .fillColor('#2563eb')
   .text('Decision 6: Launch Mobile Application')
   .moveDown(0.5);

doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#000000')
   .text('Decision Date: 2026-02-05 | Status: In Planning | Category: Product Development | Priority: High')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Description:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('Develop native mobile applications for iOS and Android to complement our web platform and capture mobile-first users.')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Key Assumptions:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• Mobile user base will grow by 200% after launch - Confidence: Medium')
   .text('• Development can be completed within 9 months - Confidence: Medium')
   .text('• App store approval process will be straightforward - Confidence: High')
   .text('• Current backend APIs can support mobile app requirements - Confidence: High')
   .text('• User experience will translate well to mobile format - Confidence: Medium')
   .moveDown(1);

doc.fontSize(12)
   .font('Helvetica-Bold')
   .text('Expected Outcomes:')
   .moveDown(0.3);

doc.fontSize(11)
   .font('Helvetica')
   .text('• 150,000 downloads in first 6 months')
   .text('• 25% increase in daily active users')
   .text('• Improved user engagement metrics')
   .moveDown(2);

// Footer
doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#666666')
   .text('Generated: 2026-02-17', { align: 'center' });

// Finalize the PDF
doc.end();

console.log('PDF generated successfully: test-decisions.pdf');
