import { motion } from "framer-motion";
import { Code, FlaskConical, Trophy } from "lucide-react";
import tejasImage from "../assets/tejas4.jpg";

export default function About() {
  const skills = [
    { name: "React", color: "blue" },
    { name: "Node.js", color: "green" },
    { name: "Python", color: "yellow" },
    { name: "Public Speaking", color: "red" },
    { name: "Data Analysis", color: "purple" },
    { name: "Research", color: "orange" },
    { name: "Leadership", color: "pink" },
    { name: "Debate", color: "teal" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
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
    <section id="about" className="section-padding bg-white">
      <div className="container-custom">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Fix: Use text-blue-800 and font-bold explicitly for headings */}
          <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-4">
            About Me
          </h2>
          <p className="text-lead max-w-3xl mx-auto text-slate-800">
            I'm Tejas Kaushik, a student, researcher, and builder passionate about leveraging technology, innovation, and community to create meaningful impact.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div 
            className="bg-slate-50 p-8 rounded-xl card-hover"
            variants={itemVariants}
          >
            <div className="text-primary text-4xl mb-4">
              <Code size={48} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-900">Development</h3>
            <p className="text-slate-800">
              Full-stack development using React, Node.js, and Firebase. I enjoy building projects that solve real-world problems, including my own volunteering app built using FlutterFlow.
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-slate-50 p-8 rounded-xl card-hover"
            variants={itemVariants}
          >
            <div className="text-primary text-4xl mb-4">
              <FlaskConical size={48} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-900">Research</h3>
            <p className="text-slate-800">
              National award-winning researcher in global health and infectious diseases. My work bridges data analysis with real-world healthcare challenges in underserved regions.
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-slate-50 p-8 rounded-xl card-hover"
            variants={itemVariants}
          >
            <div className="text-primary text-4xl mb-4">
              <Trophy size={48} />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-slate-900">Leadership & Competitions</h3>
            <p className="text-slate-800">
              Vice President at Target Alpha, President of Science Olympiad, and 1st place winner at national pitch and research competitions. I thrive in high-pressure, high-impact environments.
            </p>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <img 
              src={tejasImage} 
              alt="Tejas Kaushik profile" 
              className="rounded-xl shadow-lg w-full h-auto" 
            />
          </motion.div>
          
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Fix: Use text-blue-800 and font-bold for "My Journey" heading */}
            <h3 className="text-2xl md:text-3xl font-bold text-blue-800 mb-4">My Journey</h3>
            <p className="text-slate-800 leading-relaxed">
              After immigrating to Canada at age 8, I discovered a passion for building, problem-solving, and helping others. I began coding at 15 and have since worked on projects spanning volunteering, finance, and health.
            </p>
            <p className="text-slate-800 leading-relaxed">
              Outside of code, I tutor students, lead community initiatives, and collaborate with nonprofits. I believe in learning by doing—and giving back at every step.
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
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
        </div>
      </div>
    </section>
  );
}