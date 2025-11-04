'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'
import { useState, useRef, useEffect } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import Image from 'next/image'

interface TeamMember {
  name: string
  role: string
  credentials: string
  details: string[]
  image: string
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

export function TeamSection() {
  const [currentMember, setCurrentMember] = useState(1) // Start at index 1 to show 3 cards by default
  const carouselRef = useRef<HTMLDivElement>(null)
  const [carouselWidth, setCarouselWidth] = useState(0)
  const [cardGap, setCardGap] = useState(16)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [isSwipingHorizontally, setIsSwipingHorizontally] = useState(false)

  const teamMembers: TeamMember[] = [
    { 
      name: 'Darren Flowers', 
      role: 'Technical Director',
      credentials: 'Eden Offline (Sakira Mods TikTok)',
      details: [
        'Pipeline architecture and optimization',
        'Quality control and technical standards',
      ],
      image: '/images/team/darren.webp'
    },
    { 
      name: 'Khai Pham', 
      role: 'Lead Modeler',
      credentials: 'Sparx, Activision, Ubisoft, Riot, Disney, Marvel',
      details: [
        'Character modeling and art direction',
        'Team mentorship and style consistency',
      ],
      image: '/images/team/khai.webp'
    },
    { 
      name: 'Luka Trinh', 
      role: 'Senior Animator',
      credentials: 'Industrial Light & Magic, Sony, Blizzard',
      details: [
        'Character animation and motion systems',
        'Cinematic animation and motion direction',
      ],
      image: '/images/team/luka.webp'
    },
    { 
      name: 'Keira Kieu', 
      role: 'COO',
      credentials: 'Operations & Coordination',
      details: [
        'Operations and coordination',
        'Leadership team and staff management',
      ],
      image: '/images/team/keira.webp'
    },
  ]

  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        const computedStyle = window.getComputedStyle(carouselRef.current)
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0
        setCarouselWidth(carouselRef.current.offsetWidth - paddingLeft - paddingRight)
        // Update gap based on screen size
        setCardGap(window.innerWidth >= 768 ? 32 : 16)
      }
    }
    
    requestAnimationFrame(updateWidth)
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const nextMember = () => {
    setCurrentMember((prev) => (prev + 1) % teamMembers.length)
  }

  const prevMember = () => {
    setCurrentMember((prev) => (prev - 1 + teamMembers.length) % teamMembers.length)
  }

  // Touch handlers for mobile swipe with horizontal/vertical detection
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
    setIsSwipingHorizontally(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const currentX = e.targetTouches[0].clientX
    const currentY = e.targetTouches[0].clientY
    
    setTouchEnd({ x: currentX, y: currentY })
    
    const deltaX = Math.abs(currentX - touchStart.x)
    const deltaY = Math.abs(currentY - touchStart.y)
    
    // Determine if this is a horizontal swipe
    if (deltaX > deltaY && deltaX > 10) {
      setIsSwipingHorizontally(true)
      // Prevent vertical scroll only if swiping horizontally
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !isSwipingHorizontally) {
      setTouchStart(null)
      setTouchEnd(null)
      setIsSwipingHorizontally(false)
      return
    }
    
    const distance = touchStart.x - touchEnd.x
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextMember()
    }
    if (isRightSwipe) {
      prevMember()
    }
    
    setTouchStart(null)
    setTouchEnd(null)
    setIsSwipingHorizontally(false)
  }

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const distance = dragStart - e.clientX
    const isLeftDrag = distance > 50
    const isRightDrag = distance < -50

    if (isLeftDrag) nextMember()
    if (isRightDrag) prevMember()

    setIsDragging(false)
    setDragStart(0)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
    setDragStart(0)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevMember()
    } else if (e.key === 'ArrowRight') {
      nextMember()
    }
  }

  return (
    <Section id="team" className="bg-brand-navy">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-center mb-4 text-white">WHO{`'`}S BUILDING THIS</h2>
          
          {/* Lime accent line */}
          <div className="flex justify-center mb-16">
            <div className="lime-accent-line" />
          </div>

          {/* Production Leadership Carousel */}
          <div className="mb-16">
            <h3 className="text-brand-lime text-2xl mb-8 text-center">
              Production Leadership:
            </h3>
            
            {/* Carousel Container */}
            <div className="relative mb-12">
              {/* Three card view with sliding carousel */}
              <div 
                ref={carouselRef} 
                className={`carousel-container flex items-center justify-start gap-4 md:gap-8 relative min-h-[400px] overflow-hidden cursor-grab active:cursor-grabbing ${isSwipingHorizontally ? 'is-dragging' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="region"
                aria-label="Team members carousel"
                style={{ userSelect: 'none', touchAction: isSwipingHorizontally ? 'none' : 'pan-y' }}
              >
                <motion.div
                  className="flex items-center gap-4 md:gap-8"
                  initial={false}
                  animate={{
                    x: (() => {
                      if (!carouselWidth) return 0
                      const cardWidth = 350
                      const cardWithGap = cardWidth + cardGap
                      // Center the active card: move to center of container, then offset by current position
                      const centerOffset = (carouselWidth / 2) - (cardWidth / 2)
                      const slideOffset = -(currentMember * cardWithGap)
                      return centerOffset + slideOffset
                    })()
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 30,
                    mass: 1,
                    restDelta: 0.01,
                    restSpeed: 0.01
                  }}
                  style={{
                    willChange: 'transform',
                    touchAction: 'none'
                  }}
                >
                  {teamMembers.map((member, index) => {
                    const relativeIndex = index - currentMember
                    let position: 'prev' | 'active' | 'next' | 'hidden'
                    
                    if (relativeIndex === -1) position = 'prev'
                    else if (relativeIndex === 0) position = 'active'
                    else if (relativeIndex === 1) position = 'next'
                    else position = 'hidden'
                    
                    const isActive = position === 'active'
                    
                    return (
                      <motion.div
                        key={index}
                        className="flex-shrink-0"
                        style={{
                          width: '350px',
                          maxWidth: '90vw',
                          pointerEvents: position === 'hidden' ? 'none' : 'auto',
                          touchAction: 'none',
                        }}
                        onClick={() => setCurrentMember(index)}
                        initial={false}
                        animate={{
                          opacity: position === 'hidden' ? 0 : isActive ? 1 : 0.7,
                          scale: position === 'hidden' ? 0.8 : isActive ? 1 : 0.9,
                        }}
                        transition={{
                          duration: 0.3,
                          ease: "easeOut",
                        }}
                      >
                        <Card 
                          hover={false}
                          tilt={false}
                          className="text-center h-full cursor-pointer"
                          style={{
                            borderColor: isActive ? 'rgba(56, 194, 214, 0.3)' : undefined,
                            touchAction: 'none',
                          }}
                        >
                          <div className={`w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 ${
                            isActive ? 'border-brand-cyan/50' : 'border-brand-lime/30'
                          }`}>
                            <Image 
                              src={member.image}
                              alt={member.name}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h4 className="text-white font-bold mb-1">{member.name}</h4>
                          <p className="text-brand-cyan text-sm mb-2">{member.role}</p>
                          <p className="text-text-muted text-xs mb-4 italic">{member.credentials}</p>
                          
                          {/* Subtle divider line */}
                          <div className="w-16 h-px bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent mx-auto mb-4" />
                          
                          <ul className="space-y-2">
                            {member.details.map((detail, j) => (
                              <li key={j} className="text-text-muted text-xs flex items-center justify-center">
                                <span className="text-brand-lime mr-2">•</span>
                                <span className="text-center">{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      </motion.div>
                    )
                  })}
                </motion.div>
              </div>
            </div>

            {/* Navigation Controls with Pagination */}
            <div className="flex items-center justify-center gap-4 mt-8">
              {/* Previous Button */}
              <button
                onClick={prevMember}
                className="carousel-nav-button w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cyan/20 backdrop-blur-md border border-brand-cyan/30 flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/30 transition-all duration-300"
                aria-label="Previous team member"
              >
                <FaChevronLeft className="text-lg md:text-xl" />
              </button>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2">
                {teamMembers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMember(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentMember
                        ? 'bg-brand-cyan w-8'
                        : 'bg-brand-cyan/30 hover:bg-brand-cyan/50'
                    }`}
                    aria-label={`Go to team member ${index + 1}`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={nextMember}
                className="carousel-nav-button w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cyan/20 backdrop-blur-md border border-brand-cyan/30 flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/30 transition-all duration-300"
                aria-label="Next team member"
              >
                <FaChevronRight className="text-lg md:text-xl" />
              </button>
            </div>
          </div>

          {/* Production Capacity */}
          <div className="mb-12">
            <h3 className="text-brand-cyan text-2xl mb-8 text-center">
              Production Capacity:
            </h3>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <Card>
                <h4 className="text-brand-lime font-bold mb-4">Core Team: 10 members (8 specialists)</h4>
                <ul className="space-y-2 text-text-muted text-sm">
                  <li className="flex items-start">
                    <span className="text-brand-lime mr-2">•</span>
                    <span>24/7 workflow enables rapid iteration</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-brand-lime mr-2">•</span>
                    <span>Senior artist review on every deliverable</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-brand-lime mr-2">•</span>
                    <span>Direct access to project leadership</span>
                  </li>
                </ul>
              </Card>
              <Card>
                <h4 className="text-brand-cyan font-bold mb-4">On-Demand Capacity: 10-15+ experienced modelers</h4>
                <ul className="space-y-2 text-text-muted text-sm">
                  <li className="flex items-start">
                    <span className="text-brand-cyan mr-2">•</span>
                    <span>Senior and mid-level artists</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-brand-cyan mr-2">•</span>
                    <span>Scalable based on project needs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-brand-cyan mr-2">•</span>
                    <span>Built using proven scale-production systems</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>

        </motion.div>
      </div>
    </Section>
  )
}

