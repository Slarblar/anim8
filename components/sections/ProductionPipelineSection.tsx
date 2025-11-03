'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Section } from '../ui/Section'
import { useState, useRef, useEffect } from 'react'
import { 
  FaFileAlt,
  FaCube, 
  FaPalette,
  FaProjectDiagram,
  FaRuler,
  FaCheckCircle,
  FaBone,
  FaPlay,
  FaStar,
  FaPlus,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa'

interface ModelingStageProps {
  number: string
  title: string
  icon: React.ReactNode
  process: string[]
  tools: string[]
  quality?: string
  previewImage?: string
  index: number
  position: 'prev' | 'active' | 'next' | 'hidden'
  onAdvance?: () => void
  onSelect?: () => void
  useMobileBlur?: boolean
}

interface ExpansionCardProps {
  type: 'rigging' | 'animation' | 'rendering'
  index: number
  position: 'prev' | 'active' | 'next' | 'hidden'
  onAdvance?: () => void
  onSelect?: () => void
  useMobileBlur?: boolean
}

const cardVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9, 
    y: 40
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.4,
      ease: "easeIn"
    }
  }
}

// Mobile-specific variants with blur animations
const mobileCardVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9, 
    y: 40,
    filter: 'blur(20px)'
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
      filter: { duration: 0.4 }
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    filter: 'blur(15px)',
    transition: {
      duration: 0.4,
      ease: "easeIn"
    }
  }
}

const badgeVariants = {
  hidden: { scale: 0 },
  visible: { 
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "backOut"
    }
  }
}

function ModelingStage({ 
  number, 
  title, 
  icon, 
  process, 
  tools, 
  quality,
  previewImage,
  index,
  position,
  onAdvance,
  onSelect,
  useMobileBlur = false
}: ModelingStageProps) {
  const isActive = position === 'active'
  const isHidden = position === 'hidden'
  
  if (isHidden) return null
  
  const handleClick = () => {
    if (isActive && onAdvance) {
      onAdvance()
    } else if (onSelect) {
      onSelect()
    }
  }
  
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={useMobileBlur ? mobileCardVariants : cardVariants}
      onClick={handleClick}
      className="modeling-stage-card glass-card w-full mx-auto flex border border-brand-lime/15 flex-shrink-0 overflow-hidden relative group"
      style={{
        boxShadow: isActive 
          ? '0 12px 40px rgba(124, 193, 66, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
          : '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: isActive ? 'blur(10px)' : 'blur(20px)',
        borderRadius: '16px',
        minHeight: '380px',
        maxWidth: '520px',
        transition: 'all 0.4s ease',
        opacity: isActive ? 1 : 0.4,
        scale: isActive ? 1 : 0.85,
        filter: isActive ? 'blur(0px)' : 'blur(6px)',
        pointerEvents: 'auto',
        zIndex: isActive ? 10 : position === 'next' ? 6 : 5,
        cursor: 'pointer'
      }}
      whileHover={isActive ? {
        y: -8,
        borderColor: 'rgba(124, 193, 66, 0.3)',
        boxShadow: '0 16px 48px rgba(124, 193, 66, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      } : {}}
      whileTap={isActive && onAdvance ? {
        scale: 0.97,
        filter: 'blur(2px)',
        transition: { duration: 0.1 }
      } : {}}
    >
      {/* Left Content Section */}
      <div className="flex flex-col p-6 flex-1 z-10">
        {/* Badge and Icon - Side by Side */}
        <div className="flex items-center gap-3 mb-4">
          {/* Badge */}
          <motion.div
            variants={badgeVariants}
            className="w-8 h-8 rounded-full bg-brand-lime flex items-center justify-center text-white font-bold text-base shadow-lg flex-shrink-0"
            style={{
              boxShadow: '0 4px 12px rgba(124, 193, 66, 0.4)'
            }}
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {number}
          </motion.div>

          {/* Icon */}
          <motion.div 
            className="text-brand-lime text-3xl"
            whileHover={{ scale: 1.2, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {icon}
          </motion.div>
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-xl mb-4">
          {title}
        </h3>

        {/* Process Section */}
        <div className="mb-4">
          <h4 className="text-brand-lime font-bold text-xs uppercase mb-2 tracking-widest">
            Process:
          </h4>
          <ul className="space-y-1.5 text-text text-sm leading-relaxed">
            {process.map((item, i) => (
              <li key={i} className="flex items-start">
                <span className="text-brand-lime mr-2 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tools */}
        <div className="mb-4">
          <h4 className="text-brand-lime font-bold text-xs uppercase mb-2 tracking-widest">
            Tools:
          </h4>
          <p className="text-text text-sm">
            {tools.join(', ')}
          </p>
        </div>

        {/* Quality indicator */}
        {quality && (
          <div className="mt-auto pt-3 border-t border-brand-lime/10">
            <p className="text-text text-sm">
              {quality}
            </p>
          </div>
        )}
      </div>

      {/* Right Preview Image */}
      {previewImage && (
        <div className="relative w-32 flex-shrink-0 overflow-hidden">
          <div 
            className="absolute inset-0 opacity-50 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"
            style={{
              backgroundImage: `url(${previewImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(1)'
            }}
          />
          <div 
            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0"
            style={{
              background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)'
            }}
          />
        </div>
      )}
    </motion.div>
  )
}

function ExpansionCard({ type, index, position, onAdvance, onSelect, useMobileBlur = false }: ExpansionCardProps) {
  const isActive = position === 'active'
  const isHidden = position === 'hidden'
  
  if (isHidden) return null
  
  const handleClick = () => {
    if (isActive && onAdvance) {
      onAdvance()
    } else if (onSelect) {
      onSelect()
    }
  }
  
  const configs = {
    rigging: {
      icon: <FaBone />,
      title: 'ADD RIGGING',
      package: 'Package B',
      includes: [
        'Maya/Unreal compatible rig',
        'FK/IK controls',
        'Facial blend shapes',
        'Weight painting',
        'Control curves'
      ],
      timeline: '+2-3 days per character',
      previewImage: '/images/preview-dog.png'
    },
    animation: {
      icon: <FaPlay />,
      title: 'ADD ANIMATION',
      package: 'Package C',
      includes: [
        '5-10 animation clips',
        'Idle, walk, run cycles',
        'Character actions',
        'Turntable renders',
        'Multiple camera angles'
      ],
      timeline: '+3-5 days per character',
      previewImage: '/images/preview-phoenix.png'
    },
    rendering: {
      icon: <FaStar />,
      title: 'CUSTOM RENDERING',
      package: 'Custom',
      includes: [
        '4K beauty renders',
        'Lighting variations',
        'Material breakdowns',
        'Video turntables',
        'Promotional assets'
      ],
      timeline: '+1-2 days per character',
      previewImage: '/images/preview-bobcat.png'
    }
  }

  const config = configs[type]

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={useMobileBlur ? mobileCardVariants : cardVariants}
      onClick={handleClick}
      className="expansion-card glass-card w-full mx-auto flex border border-brand-cyan/20 overflow-hidden relative group"
      style={{
        boxShadow: isActive
          ? '0 12px 40px rgba(56, 194, 214, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
          : '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: isActive ? 'blur(12px)' : 'blur(20px)',
        borderRadius: '20px',
        minHeight: '420px',
        maxWidth: '470px',
        transition: 'all 0.4s ease',
        opacity: isActive ? 1 : 0.4,
        scale: isActive ? 1 : 0.85,
        filter: isActive ? 'blur(0px)' : 'blur(6px)',
        pointerEvents: 'auto',
        zIndex: isActive ? 10 : position === 'next' ? 6 : 5,
        cursor: 'pointer'
      }}
      whileHover={isActive ? {
        y: -10,
        borderColor: 'rgba(56, 194, 214, 0.4)',
        boxShadow: '0 16px 48px rgba(56, 194, 214, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      } : {}}
      whileTap={isActive && onAdvance ? {
        scale: 0.97,
        filter: 'blur(2px)',
        transition: { duration: 0.1 }
      } : {}}
    >
      {/* Left Content Section */}
      <div className="flex flex-col p-8 flex-1 z-10">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            whileHover={{ scale: 1.2, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <FaPlus className="text-brand-cyan text-xl" />
          </motion.div>
          <motion.div 
            className="text-brand-cyan text-3xl"
            whileHover={{ scale: 1.3, rotate: 360 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            {config.icon}
          </motion.div>
        </div>

        <h3 className="text-white font-bold text-xl mb-2">
          {config.title}
        </h3>

        <div className="mb-6">
          <h4 className="text-brand-cyan font-bold text-xs uppercase mb-3 tracking-wider">
            What{`'`}s included:
          </h4>
          <ul className="space-y-2 text-text text-sm">
            {config.includes.map((item, i) => (
              <li key={i} className="flex items-start">
                <span className="text-brand-cyan mr-2">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-4 border-t border-brand-cyan/20">
          <p className="text-text text-sm">
            Timeline: <span className="text-white">{config.timeline}</span>
          </p>
        </div>
      </div>

      {/* Right Preview Image */}
      {config.previewImage && (
        <div className="relative w-32 flex-shrink-0 overflow-hidden">
          <div 
            className="absolute inset-0 opacity-50 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"
            style={{
              backgroundImage: `url(${config.previewImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(1)'
            }}
          />
          <div 
            className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0"
            style={{
              background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)'
            }}
          />
        </div>
      )}
    </motion.div>
  )
}

function FinalOutputBox() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, ease: "backOut" }}
      className="glass-card p-8 max-w-[1100px] mx-auto mt-10 border-2 border-brand-lime"
      style={{
        background: 'rgba(124, 193, 66, 0.08)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px'
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: '0 16px 48px rgba(124, 193, 66, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Content */}
        <div className="text-center md:text-left">
          <motion.div 
            className="flex items-center justify-center md:justify-start gap-3 mb-6"
            whileHover={{ scale: 1.1 }}
          >
            <FaCheckCircle className="text-brand-lime text-2xl" />
            <h3 className="text-white font-extrabold text-2xl">
              PRODUCTION-READY 3D MODEL
            </h3>
          </motion.div>
          
          <div className="mb-6">
            <h4 className="text-brand-lime font-bold text-sm uppercase mb-4 tracking-wider">
              Deliverables:
            </h4>
            <ul className="space-y-2 text-text text-sm text-left">
              <li className="flex items-start">
                <span className="text-brand-lime mr-2">•</span>
                <span>Clean quad topology (optimized)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-2">•</span>
                <span>Professional PBR textures (2K-4K)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-2">•</span>
                <span>Multiple file formats (FBX, OBJ, USD)</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-2">•</span>
                <span>Organized naming & structure</span>
              </li>
              <li className="flex items-start">
                <span className="text-brand-lime mr-2">•</span>
                <span>Technical documentation</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-6 border-t border-brand-lime/30">
            <h4 className="text-brand-cyan font-bold text-sm uppercase mb-3 tracking-wider">
              AI Training-Ready:
            </h4>
            <p className="text-text">
              IP-safe & consistent • Dataset-ready • Production-grade
            </p>
          </div>
        </div>

        {/* Right side - Image */}
        <motion.div 
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <img 
            src="/images/wireframe-astronaut.webp" 
            alt="Wireframe 3D Model Example"
            className="w-full max-w-[238px] h-auto object-contain drop-shadow-[0_0_30px_rgba(124,193,66,0.3)]"
          />
        </motion.div>
      </div>
    </motion.div>
  )
}

export function ProductionPipelineSection() {
  const [currentStage, setCurrentStage] = useState(0)
  const [currentExpansion, setCurrentExpansion] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const expansionCarouselRef = useRef<HTMLDivElement>(null)
  const [carouselWidth, setCarouselWidth] = useState(0)
  const [expansionCarouselWidth, setExpansionCarouselWidth] = useState(0)

  const modelingStages = [
    {
      number: "01",
      title: "CONCEPT REVIEW",
      icon: <FaFileAlt />,
      process: [
        "Analyze 2D reference",
        "Identify technical requirements",
        "Plan topology approach",
        "Confirm style direction"
      ],
      tools: ["PureRef", "Photoshop"],
      previewImage: "/images/modeling-pipeline/concept-review.webp"
    },
    {
      number: "02",
      title: "BLOCKOUT",
      icon: <FaCube />,
      process: [
        "Establish proportions",
        "Define primary shapes",
        "Lock silhouette",
        "Client approval checkpoint"
      ],
      tools: ["Blender 4.0", "Maya", "ZBrush"],
      previewImage: "/images/modeling-pipeline/blockout.webp"
    },
    {
      number: "03",
      title: "HIGH-POLY SCULPT",
      icon: <FaPalette />,
      process: [
        "Add organic details",
        "Sculpt character features",
        "Refine forms & volumes",
        "Create accessories"
      ],
      tools: ["ZBrush", "Blender Sculpt Mode"],
      previewImage: "/images/modeling-pipeline/high-polysculpt.webp"
    },
    {
      number: "04",
      title: "RETOPOLOGY",
      icon: <FaProjectDiagram />,
      process: [
        "Clean quad topology",
        "Optimize edge flow",
        "Rig-ready structure",
        "Target poly count: 15k-35k"
      ],
      tools: ["Blender", "Quad Remesher", "Topogun", "ZBrush"],
      quality: "All quads, no n-gons",
      previewImage: "/images/preview-dog.png"
    },
    {
      number: "05",
      title: "UV UNWRAPPING",
      icon: <FaRuler />,
      process: [
        "Strategic seam placement",
        "0-1 UV space layout",
        "10% island margin",
        "Texture density optimization"
      ],
      tools: ["Blender", "Maya"],
      quality: "Single UV set, organized",
      previewImage: "/images/modeling-pipeline/uv-unwrapping.webp"
    },
    {
      number: "06",
      title: "TEXTURING & QC",
      icon: <FaPalette />,
      process: [
        "PBR material creation",
        "Bake high-poly details",
        "Color/roughness/normal maps",
        "Final quality check"
      ],
      tools: ["Substance 3D Painter", "Blender"],
      quality: "Production-ready model",
      previewImage: "/images/modeling-pipeline/texturing-qc.webp"
    }
  ]

  const expansions = ['rigging', 'animation', 'rendering'] as const

  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        // Get the actual visible width (accounting for padding)
        const computedStyle = window.getComputedStyle(carouselRef.current)
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0
        setCarouselWidth(carouselRef.current.offsetWidth - paddingLeft - paddingRight)
      }
      if (expansionCarouselRef.current) {
        const computedStyle = window.getComputedStyle(expansionCarouselRef.current)
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0
        setExpansionCarouselWidth(expansionCarouselRef.current.offsetWidth - paddingLeft - paddingRight)
      }
    }
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(updateWidth)
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const nextStage = () => {
    setCurrentStage((prev) => (prev + 1) % modelingStages.length)
  }

  const prevStage = () => {
    setCurrentStage((prev) => (prev - 1 + modelingStages.length) % modelingStages.length)
  }

  const nextExpansion = () => {
    setCurrentExpansion((prev) => (prev + 1) % expansions.length)
  }

  const prevExpansion = () => {
    setCurrentExpansion((prev) => (prev - 1 + expansions.length) % expansions.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextStage()
    }
    if (isRightSwipe) {
      prevStage()
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent, type: 'stage' | 'expansion') => {
    setIsDragging(true)
    setDragStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
  }

  const handleMouseUp = (e: React.MouseEvent, type: 'stage' | 'expansion') => {
    if (!isDragging) return
    
    const distance = dragStart - e.clientX
    const isLeftDrag = distance > 50
    const isRightDrag = distance < -50

    if (type === 'stage') {
      if (isLeftDrag) nextStage()
      if (isRightDrag) prevStage()
    } else {
      if (isLeftDrag) nextExpansion()
      if (isRightDrag) prevExpansion()
    }

    setIsDragging(false)
    setDragStart(0)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setDragStart(0)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, type: 'stage' | 'expansion') => {
    if (type === 'stage') {
      if (e.key === 'ArrowLeft') {
        prevStage()
      } else if (e.key === 'ArrowRight') {
        nextStage()
      }
    } else {
      if (e.key === 'ArrowLeft') {
        prevExpansion()
      } else if (e.key === 'ArrowRight') {
        nextExpansion()
      }
    }
  }

  // Auto-advance carousel (optional, can be disabled)
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setCurrentStage((prev) => (prev + 1) % modelingStages.length)
  //   }, 5000)
  //   return () => clearInterval(interval)
  // }, [])

  return (
    <Section id="production-pipeline" className="bg-background-dark relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="gradient-orb gradient-orb-1" style={{ top: '10%', left: '5%' }} />
      <div className="gradient-orb gradient-orb-2" style={{ top: '60%', right: '10%' }} />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">
            MODELING PIPELINE
          </h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-6">
            <div className="h-1 w-20 rounded-full bg-brand-lime" />
          </div>

          <p className="text-center mb-12 text-text-light text-lg">
            Our specialized character production process
          </p>

          {/* Carousel Container */}
          <div className="relative mb-12">
            {/* Carousel Content - full width */}
            <div
              className="relative w-full overflow-visible cursor-grab active:cursor-grabbing"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => handleMouseDown(e, 'stage')}
              onMouseMove={handleMouseMove}
              onMouseUp={(e) => handleMouseUp(e, 'stage')}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, 'stage')}
              tabIndex={0}
              role="region"
              aria-label="Modeling pipeline stages"
              style={{ userSelect: 'none' }}
            >
              {/* Mobile: Single card view */}
              <div className="flex md:hidden items-center justify-center min-h-[420px]">
                <AnimatePresence mode="wait">
                  <ModelingStage
                    key={currentStage}
                    {...modelingStages[currentStage]}
                    index={currentStage}
                    position="active"
                    onAdvance={nextStage}
                    useMobileBlur={true}
                  />
                </AnimatePresence>
              </div>

              {/* Desktop: Three card view with sliding */}
              <div ref={carouselRef} className="hidden md:flex items-center justify-start gap-16 relative min-h-[420px] overflow-visible">
                <motion.div
                  className="flex items-center gap-16"
                  initial={false}
                  animate={{
                    x: carouselWidth ? (carouselWidth / 2) - 260 - (currentStage * 584) : 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 35,
                    mass: 0.8
                  }}
                  style={{
                    willChange: 'transform'
                  }}
                >
                  {modelingStages.map((stage, index) => {
                    const relativeIndex = index - currentStage
                    let position: 'prev' | 'active' | 'next' | 'hidden'
                    
                    if (relativeIndex === -1) position = 'prev'
                    else if (relativeIndex === 0) position = 'active'
                    else if (relativeIndex === 1) position = 'next'
                    else position = 'hidden'
                    
                    return (
                      <div
                        key={index}
                        className="flex-shrink-0"
                        style={{
                          width: '520px',
                          opacity: position === 'hidden' ? 0 : 1,
                          pointerEvents: position === 'hidden' ? 'none' : 'auto'
                        }}
                      >
                        <ModelingStage
                          {...stage}
                          index={index}
                          position={position}
                          onAdvance={nextStage}
                          onSelect={() => setCurrentStage(index)}
                        />
                      </div>
                    )
                  })}
                </motion.div>
              </div>
            </div>

            {/* Navigation Controls with Pagination */}
            <div className="flex items-center justify-center gap-4 mt-8">
              {/* Previous Button */}
              <button
                onClick={prevStage}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-lime/20 backdrop-blur-md border border-brand-lime/30 flex items-center justify-center text-brand-lime hover:bg-brand-lime/30 transition-all duration-300"
                aria-label="Previous stage"
              >
                <FaChevronLeft className="text-lg md:text-xl" />
              </button>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2">
                {modelingStages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStage(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentStage
                        ? 'bg-brand-lime w-8'
                        : 'bg-brand-lime/30 hover:bg-brand-lime/50'
                    }`}
                    aria-label={`Go to stage ${index + 1}`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={nextStage}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-lime/20 backdrop-blur-md border border-brand-lime/30 flex items-center justify-center text-brand-lime hover:bg-brand-lime/30 transition-all duration-300"
                aria-label="Next stage"
              >
                <FaChevronRight className="text-lg md:text-xl" />
              </button>
            </div>
          </div>

          {/* Final Output Box */}
          <FinalOutputBox />

          {/* Optional Expansions */}
          <motion.h3 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-brand-cyan text-center mt-20 mb-10 font-bold text-2xl"
          >
            OPTIONAL EXPANSIONS
          </motion.h3>

          {/* Expansion Carousel */}
          <div className="relative mb-12">
            {/* Expansion Carousel Content - full width */}
            <div 
              className="relative w-full overflow-visible cursor-grab active:cursor-grabbing"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => {
                if (!touchStart || !touchEnd) return
                const distance = touchStart - touchEnd
                const isLeftSwipe = distance > 50
                const isRightSwipe = distance < -50

                if (isLeftSwipe) nextExpansion()
                if (isRightSwipe) prevExpansion()
                
                setTouchStart(0)
                setTouchEnd(0)
              }}
              onMouseDown={(e) => handleMouseDown(e, 'expansion')}
              onMouseMove={handleMouseMove}
              onMouseUp={(e) => handleMouseUp(e, 'expansion')}
              onMouseLeave={handleMouseLeave}
              onKeyDown={(e) => handleKeyDown(e, 'expansion')}
              tabIndex={0}
              role="region"
              aria-label="Optional expansion services"
              style={{ userSelect: 'none' }}
            >
              {/* Mobile: Single card view */}
              <div className="flex md:hidden items-center justify-center min-h-[460px]">
                <AnimatePresence mode="wait">
                  <ExpansionCard
                    key={currentExpansion}
                    type={expansions[currentExpansion]}
                    index={currentExpansion}
                    position="active"
                    onAdvance={nextExpansion}
                    useMobileBlur={true}
                  />
                </AnimatePresence>
              </div>

              {/* Desktop: Three card view with sliding */}
              <div ref={expansionCarouselRef} className="hidden md:flex items-center justify-start gap-8 relative min-h-[460px] overflow-visible">
                <motion.div
                  className="flex items-center gap-8"
                  initial={false}
                  animate={{
                    x: expansionCarouselWidth ? (expansionCarouselWidth / 2) - 235 - (currentExpansion * 502) : 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 35,
                    mass: 0.8
                  }}
                  style={{
                    willChange: 'transform'
                  }}
                >
                  {expansions.map((type, index) => {
                    const relativeIndex = index - currentExpansion
                    let position: 'prev' | 'active' | 'next' | 'hidden'
                    
                    if (relativeIndex === -1) position = 'prev'
                    else if (relativeIndex === 0) position = 'active'
                    else if (relativeIndex === 1) position = 'next'
                    else position = 'hidden'

                    return (
                      <div
                        key={index}
                        className="flex-shrink-0"
                        style={{
                          width: '470px',
                          opacity: position === 'hidden' ? 0 : 1,
                          pointerEvents: position === 'hidden' ? 'none' : 'auto'
                        }}
                      >
                        <ExpansionCard
                          type={type}
                          index={index}
                          position={position}
                          onAdvance={nextExpansion}
                          onSelect={() => setCurrentExpansion(index)}
                        />
                      </div>
                    )
                  })}
                </motion.div>
              </div>
            </div>

            {/* Navigation Controls with Pagination */}
            <div className="flex items-center justify-center gap-4 mt-8">
              {/* Previous Button */}
              <button
                onClick={prevExpansion}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cyan/20 backdrop-blur-md border border-brand-cyan/30 flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/30 transition-all duration-300"
                aria-label="Previous expansion"
              >
                <FaChevronLeft className="text-lg md:text-xl" />
              </button>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2">
                {expansions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentExpansion(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentExpansion
                        ? 'bg-brand-cyan w-8'
                        : 'bg-brand-cyan/30 hover:bg-brand-cyan/50'
                    }`}
                    aria-label={`Go to expansion ${index + 1}`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={nextExpansion}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cyan/20 backdrop-blur-md border border-brand-cyan/30 flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/30 transition-all duration-300"
                aria-label="Next expansion"
              >
                <FaChevronRight className="text-lg md:text-xl" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  )
}
