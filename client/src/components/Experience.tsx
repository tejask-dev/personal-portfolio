'use client';
import { Timeline } from './Timeline';
import { ExperienceCard } from './ExperienceCard';

// Import images
import personalWebsite from '../assets/Personal Website.png';
import scienceOlympiad1 from '../assets/Science Olympiad/Hydroecology.jpg';
import scienceOlympiad2 from '../assets/Science Olympiad/Chemisty.jpg';
import targetAlpha from '../assets/Target Alpha/TargetAlpha.jpg';
import huvtsp from '../assets/HUVTSP/HUVTSP-1.png';
import youreka1 from '../assets/Youreka/YourekaSymposium.jpg';
import youreka2 from '../assets/Youreka/Research Paper.png';
import docubridge from '../assets/Docubridge.png';
import somaAI from '../assets/SomaAI.png';
import debateMedal from '../assets/DebateMedal.jpg';
import oslc1 from '../assets/20241103_160449072.jpeg';
import oslc2 from '../assets/20241103_160456418.jpeg';
import waterlooCatalystImage from '../assets/WaterlooCatalyst/image.png';
import stellarImage from '../assets/Stellar/image.png';

export default function Experience() {
    const data = [
        {
            title: '2021',
            subtitle: 'Founded',
            content: (
                <ExperienceCard
                    company="Top Score Tutoring"
                    role="Founder & CEO"
                    location="Canada"
                    description={
                        <>
                            Founded and scaled a tutoring business that has helped{' '}
                            <span className="font-serif font-bold italic">40+ students</span> improve their academic performance. Developed curriculum and managed a team of tutors across{' '}
                            <span className="font-serif font-bold italic">multiple subjects</span>.
                        </>
                    }
                />
            )
        },
        {
            title: '2022',
            subtitle: 'Competition',
            content: (
                <ExperienceCard
                    company="Science Olympiad"
                    role="Competitor"
                    location="Regional"
                    description={
                        <>
                            Competed in various scientific events, demonstrating expertise in{' '}
                            <span className="font-serif font-bold italic">Hydroecology and Chemistry</span>. Applied scientific principles to solve complex problems and{' '}
                            <span className="font-serif font-bold italic">conduct experiments</span>.
                        </>
                    }
                    images={[
                        { src: scienceOlympiad1, alt: 'Hydroecology' },
                        { src: scienceOlympiad2, alt: 'Chemistry' }
                    ]}
                />
            )
        },
        {
            title: '2023',
            subtitle: 'Finance',
            content: (
                <ExperienceCard
                    company="Target Alpha Windsor Essex County Chapter"
                    role="Vice-President"
                    location="National"
                    description={
                        <>
                            Participated in Target Alpha, a premier{' '}
                            <span className="font-serif font-bold italic">financial case competition</span>. Analyzed market trends and developed{' '}
                            <span className="font-serif font-bold italic">strategic investment recommendations</span>.
                        </>
                    }
                    images={[
                        { src: targetAlpha, alt: 'Target Alpha Competition' }
                    ]}
                />
            )
        },
        {
            title: '2024',
            subtitle: 'Leadership',
            content: (
                <ExperienceCard
                    company="Ontario Senior Leadership Conference"
                    role="Spirit Leader"
                    location="Ontario"
                    description={
                        <>
                            Selected as{' '}
                            <span className="font-serif font-bold italic">Spirit Leader</span> for the Ontario Senior Leadership Conference. Led activities and inspired 2500+{' '}
                            <span className="font-serif font-bold italic">student leaders</span> across the province.
                        </>
                    }
                    images={[
                        { src: oslc1, alt: 'OSLC Spirit Leader' },
                        { src: oslc2, alt: 'OSLC Team' },
                    ]}
                />
            )
        },
        {
            title: '2025',
            subtitle: 'Waterloo',
            content: (
                <ExperienceCard
                    company="Waterloo Catalyst"
                    role="Participant"
                    location="University of Waterloo"
                    description={
                        <>
                            Participated in Waterloo Catalyst program, focusing on{' '}
                            <span className="font-serif font-bold italic">innovation and entrepreneurship</span>. Gained insights into{' '}
                            <span className="font-serif font-bold italic">startup development and technology commercialization</span>.
                        </>
                    }
                    images={[
                        { src: waterlooCatalystImage, alt: 'Waterloo Catalyst Certificate' }
                    ]}
                />
            )
        },
        {
            title: '2025',
            subtitle: 'Harvard',
            content: (
                <ExperienceCard
                    company="Harvard Ventures"
                    role="Alumni"
                    location="Harvard University"
                    description={
                        <>
                            Selected for Harvard Ventures program, gaining insights into{' '}
                            <span className="font-serif font-bold italic">entrepreneurship and venture capital</span>. Worked on business development and{' '}
                            <span className="font-serif font-bold italic">pitch presentations</span> for innovative startups.
                        </>
                    }
                    images={[
                        { src: huvtsp, alt: 'Harvard Ventures' }
                    ]}
                />
            )
        },
        {
            title: '2025',
            subtitle: 'Harvard',
            content: (
                <ExperienceCard
                    company="CS50x"
                    role="Student"
                    location="Harvard University"
                    description={
                        <>
                            Enrolled in Harvard's CS50x course, gaining comprehensive knowledge in{' '}
                            <span className="font-serif font-bold italic">computer science fundamentals</span>. Learning{' '}
                            <span className="font-serif font-bold italic">C, Python, SQL, HTML, CSS, JavaScript</span> and web development.
                        </>
                    }
                    images={[
                        { src: personalWebsite, alt: 'CS50x Course' }
                    ]}
                />
            )
        },
        {
            title: '2025',
            subtitle: 'National',
            content: (
                <ExperienceCard
                    company="Youreka Global Health"
                    role="National Winner"
                    location="National"
                    description={
                        <>
                            Won <span className="font-serif font-bold italic">1st place nationally</span> for research on HIV treatment in Sub-Saharan Africa. Research paper{' '}
                            <span className="font-serif font-bold italic">soon to be published</span> and contributed to advancing pediatric ART research.
                        </>
                    }
                    images={[
                        { src: youreka2, alt: 'Research Paper' },
                        { src: youreka1, alt: 'Youreka Symposium' }
                    ]}
                />
            )
        },
        {
            title: '2025',
            subtitle: 'Summer',
            content: (
                <ExperienceCard
                    company="Docubridge"
                    role="Software Engineering Intern"
                    location="Remote"
                    description={
                        <>
                            Worked as a software engineering intern, contributing to{' '}
                            <span className="font-serif font-bold italic">AI document processing and Financial Analysis platform</span>. Gained experience in{' '}
                            <span className="font-serif font-bold italic">React, TypeScript, and Node.js</span> while working on real-world projects. Worked on the financial analysis platform, which is a web application that allows users to upload financial documents and analyze them using AI.
                        </>
                    }
                    images={[
                        { src: docubridge, alt: 'Docubridge Platform' }
                    ]}
                />
            )
        },
        {
            title: '2025',
            subtitle: 'Present',
            content: (
                <ExperienceCard
                    company="SomaAI"
                    role="Founder & Developer"
                    location="Remote"
                    description={
                        <>
                            Developed an AI-powered platform that enables users to talk to a AI private chatbot where you can pose any questions related to Mental Health and get personalized answers. {' '}
                            <span className="font-serif font-bold italic">300+ active users</span>. Exploring next-generation AI systems and{' '}
                            <span className="font-serif font-bold italic">intelligent automation</span> for real-world problem solving.
                        </>
                    }
                    images={[
                        { src: somaAI, alt: 'SomaAI Platform' }
                    ]}
                />
            )
        },
        {
            title: '2025',
            subtitle: 'Present',
            content: (
                <ExperienceCard
                    company="Stellar Learning"
                    role="Deputy CTO"
                    location="Remote"
                    description={
                        <>
                            Leading the technical development of an AI-powered learning platform that enables students to learn at their own pace and get personalized recommendations. {' '}
                            <span className="font-serif font-bold italic">10,000+ students</span>. Built scalable architecture and implemented machine learning algorithms for{' '}
                            <span className="font-serif font-bold italic">personalized learning experiences</span>.
                        </>
                    }
                    images={[
                        { src: stellarImage, alt: 'Stellar Learning Platform' }
                    ]}
                />
            )
        }
    ];

    return (
        <div className="relative w-full overflow-clip bg-linear-to-b from-[#1c192a99] to-[#04020e]" id="experience">
            <Timeline data={data} />
        </div>
    );
}
