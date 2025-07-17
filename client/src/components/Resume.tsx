import { motion } from "framer-motion";
import { GraduationCap, Briefcase } from "lucide-react";

export default function Resume() {
  const education = [
    {
      degree: "High School Diploma (Grades 9 & 10)",
      school: "Riverside Secondary School",
      period: "Sep 2022 - June 2024",
      description:
        "Active leadership roles; participated in Ontario Student Leadership Conference (OSLC).",
    },
    {
      degree: "High School Diploma (Grades 11 - 12)",
      school: "Assumption College Catholic High School",
      period: "Sep 2024 - Present",
      description:
        "Honor roll distinction, Science Olympiad president, volunteer and student leader in community initiatives.",
    },
  ];

  const experience = [
    {
      position: "Intern",
      company: "DocuBridge (through HUVTSP Internship Program)",
      period: "Summer 2025",
      description:
        "Contributed to software development and collaborative projects during the Harvard Ventures Tech Summer Program.",
    },
    {
      position: "Participant",
      company: "Waterloo Catalyst Program - Early Entrepreneurs Stream",
      period: "Summer 2025",
      description:
        "Selected for entrepreneurship program focused on startup development, engineering and business skills.",
    },
    {
      position: "Founder & Tutor",
      company: "Top Score Tutoring",
      period: "2022 - Present",
      description:
        "Founded and manage a tutoring company focused on academic excellence through personalized sessions.",
    },
    {
      position: "Researcher",
      company: "Youreka National Research Program",
      period: "2025",
      description:
        "Conduct research on infectious diseases and adolescent fertility in Sub-Saharan Africa; won national awards including 3MT Challenge.",
    },
    {
      position: "Student Leader & OSLC Delegate",
      company: "Ontario Student Leadership Conference (OSLC) & Community",
      period: "2019 - Present",
      description:
        "Represented my school at OSLC, connecting with youth leaders from across Ontario to build leadership skills, inspire change, and develop student initiatives. Ongoing volunteer and leadership work in local community projects and school events.",
    },
  ];

  const skills = {
    Frontend: [
      { name: "React", color: "blue" },
      { name: "Tailwind CSS", color: "blue" },
      { name: "Framer Motion", color: "blue" },
      { name: "Flutter", color: "blue" },
    ],
    Backend: [
      { name: "Node.js", color: "green" },
      { name: "Python", color: "green" },
      { name: "Firebase", color: "green" },
      { name: "MongoDB", color: "green" },
    ],
    "Tools & Others": [
      { name: "Git & GitHub", color: "purple" },
      { name: "Docker", color: "purple" },
      { name: "React Query", color: "purple" },
      { name: "Machine Learning Basics", color: "purple" },
    ],
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  };

  return (
    <section id="resume" className="section-padding bg-slate-50">
      <div className="container-custom">
        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-4">
            Resume
          </h2>
          <p className="text-lead text-slate-700 max-w-2xl mx-auto">
            My academic background, experiences, and skills
          </p>
        </motion.div>

        {/* Education */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {education.map((edu, index) => (
            <motion.div
              key={index}
              className="bg-white p-6 rounded-xl shadow-md border border-slate-200 flex flex-col"
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center mb-3">
                <GraduationCap className="text-blue-700 mr-3" size={28} />
                <h3 className="text-lg font-semibold text-blue-800">
                  {edu.school}
                </h3>
              </div>
              <div className="text-sm font-medium text-slate-600 mb-1">
                {edu.period}
              </div>
              <div className="text-md font-bold text-slate-800 mb-2">{edu.degree}</div>
              <div className="text-slate-700">{edu.description}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Experience */}
        <motion.div
          className="mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h3 className="text-2xl font-bold text-blue-800 mb-8 flex items-center">
            <Briefcase className="text-blue-700 mr-3" size={28} />
            Experience
          </h3>
          <div className="relative">
            <div className="hidden md:block absolute left-4 top-0 h-full w-1 bg-blue-100 rounded-full" />
            <div className="space-y-8">
              {experience.map((exp, index) => (
                <motion.div
                  key={index}
                  className="relative pl-10 md:pl-16"
                  variants={itemVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="absolute left-0 md:left-3 top-2 w-4 h-4 bg-blue-600 rounded-full border-4 border-blue-200" />
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <h4 className="text-lg font-semibold text-slate-800">
                        {exp.position}
                      </h4>
                      <span className="text-primary font-medium">
                        {exp.company}
                      </span>
                    </div>
                    <div className="text-slate-600 text-sm mb-2">
                      {exp.period}
                    </div>
                    <div className="text-slate-700">{exp.description}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Skills */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h3 className="text-2xl font-bold text-blue-800 mb-8 text-center">
            Technical Skills
          </h3>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {Object.entries(skills).map(([category, skillList]) => (
              <motion.div
                key={category}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 card-hover"
                variants={itemVariants}
              >
                <h4 className="text-lg font-semibold text-slate-800 mb-4">
                  {category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skillList.map((skill, index) => (
                    <motion.span
                      key={skill.name}
                      className={`tag tag-${skill.color}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      {skill.name}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
