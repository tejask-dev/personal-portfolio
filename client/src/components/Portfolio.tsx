import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, ExternalLink } from "lucide-react";

import SignifyImg from "../assets/Signify.png";
import PersonalWebsiteImg from "../assets/Personal Website.png";
import ResearchPaperImg from "../assets/Research Paper.png";
import VolunTrackImg from "../assets/Personal Website.png"; // Replace with your VolunTrack image if available

type Project = {
  id: string;
  title: string;
  description: string;
  category: "Web Apps" | "Research";
  imageUrl: string;
  technologies: string[];
  projectUrl?: string;
  githubUrl?: string;
};

export default function Portfolio() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Web Apps", "Research"];

  // Project data
  const projects: Project[] = [
    {
      id: "signify",
      title: "Signify",
      description:
        "Sign language translator and emotion recognition model developed during a hackathon. My teammate developed Frontend, and I developed the backend.",
      category: "Web Apps",
      imageUrl: SignifyImg,
      technologies: ["Python", "TensorFlow", "React"],
      githubUrl: "https://github.com/Shehwaz81/Signify",
    },
    {
      id: "voluntrack",
      title: "VolunTrack",
      description:
        "A volunteering hours tracker app for students and organizations. Built with React and Firebase, featuring authentication and real-time data sync.",
      category: "Web Apps",
      imageUrl: VolunTrackImg,
      technologies: ["React", "Firebase", "Tailwind CSS"],
      githubUrl: "https://github.com/tejask-dev/voluntrack", // Replace with actual repo if available
      projectUrl: "#", // Add deployed link if available
    },
    {
      id: "personal-website",
      title: "Personal Website",
      description:
        "My personal website showcasing projects, blog, and portfolio. Built with React and Tailwind CSS.",
      category: "Web Apps",
      imageUrl: PersonalWebsiteImg,
      technologies: ["React", "Tailwind CSS", "Framer Motion"],
      githubUrl: "https://github.com/tejask-dev/portfolio",
    },
    {
      id: "hiv-research",
      title: "HIV Research Paper",
      description:
        "Exploring adolescent fertility rates and pediatric Antiretroviral Therapy (ART) in Sub-Saharan Africa. Publication in progress.",
      category: "Research",
      imageUrl: ResearchPaperImg,
      technologies: ["Data Analysis", "Public Health", "R"],
    },
  ];

  // Filter projects based on selected category
  const filteredProjects = projects.filter(
    (project) => selectedCategory === "All" || project.category === selectedCategory
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  const tagColors = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-yellow-100 text-yellow-800",
    "bg-pink-100 text-pink-800",
    "bg-red-100 text-red-800",
    "bg-indigo-100 text-indigo-800",
    "bg-teal-100 text-teal-800",
    "bg-orange-100 text-orange-800",
    "bg-cyan-100 text-cyan-800",
  ];

  return (
    <section id="portfolio" className="section-padding bg-white">
      <div className="container-custom">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-blue-800 mb-4">Portfolio</h2>
          <p className="text-lead text-slate-700 max-w-2xl mx-auto">
            A showcase of my recent projects and achievements
          </p>
        </motion.div>

        {/* Project Categories */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 border-2
                ${
                  selectedCategory === category
                    ? "bg-blue-700 text-white border-blue-700 shadow-lg"
                    : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
                }`}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Projects Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden card-hover border border-slate-200 transition-transform duration-200 hover:-translate-y-2"
                variants={itemVariants}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-56 object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <div className="p-6 flex flex-col h-full">
                  <h3 className="text-xl font-bold text-blue-800 mb-2">{project.title}</h3>
                  <p className="text-slate-700 mb-4">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.technologies.map((tech, index) => (
                      <span
                        key={tech}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${tagColors[index % tagColors.length]}`}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-auto pt-2">
                    {project.projectUrl ? (
                      <a
                        href={project.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:text-blue-900 font-medium flex items-center gap-2"
                      >
                        <ExternalLink size={16} />
                        View Project
                      </a>
                    ) : (
                      <span />
                    )}

                    {project.githubUrl ? (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-blue-700 transition-colors duration-200"
                      >
                        <Github size={22} />
                      </a>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}