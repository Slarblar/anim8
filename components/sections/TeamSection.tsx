'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Section } from '../ui/Section'
import { Card } from '../ui/Card'
import { useState, useRef, useEffect, useCallback } from 'react'
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
  const [currentMember, setCurrentMember] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Core leadership team members - ordered by technical relevance
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
      credentials: 'Sparx, Activision, Ubisoft, Marvel',
      details: [
        'Character modeling and art direction',
        'Team mentorship and style consistency',
      ],
      image: '/images/team/khai.webp'
    },
    { 
      name: 'Luka', 
      role: 'Senior Modeler',
      credentials: 'ILM · AAA Senior Animator',
      details: [
        'High-quality character and prop modeling',
        'Advanced sculpting and retopology',
      ],
      image: '/images/team/luka.webp'
    },
    { 
      name: 'Keira Duong', 
      role: 'Chief Operating Officer',
      credentials: 'Big 4 Advisory, Finance & Strategic Growth',
      details: [
        'Strategic operations and governance',
        'Financial planning and team leadership',
      ],
      image: '/images/team/keira.webp'
    }
  ]

  useEffect(() => {
    const updateResponsiveState = () => {
      const screenWidth = window.innerWidth
      setIsMobile(screenWidth < 768)
      setIsTablet(screenWidth >= 768 && screenWidth < 1024)
    }
    
    updateResponsiveState()
    window.addEventListener('resize', updateResponsiveState)
    return () => window.removeEventListener('resize', updateResponsiveState)
  }, [])

  const nextMember = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentMember((prev) => (prev + 1) % teamMembers.length)
    setTimeout(() => setIsAnimating(false), 300)
  }, [isAnimating, teamMembers.length])

  const prevMember = useCallback(() => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentMember((prev) => (prev - 1 + teamMembers.length) % teamMembers.length)
    setTimeout(() => setIsAnimating(false), 300)
  }, [isAnimating, teamMembers.length])

  // Simplified touch handlers optimized for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouchStartY(e.touches[0].clientY)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isAnimating) return
    
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const deltaX = touchStartX - touchEndX
    const deltaY = Math.abs(touchStartY - touchEndY)
    
    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        nextMember()
      } else {
        prevMember()
      }
    }
  }, [touchStartX, touchStartY, isAnimating, nextMember, prevMember])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevMember()
    } else if (e.key === 'ArrowRight') {
      nextMember()
    }
  }, [prevMember, nextMember])

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
            
            {/* Mobile: Simple Card Transition */}
            {isMobile && (
              <div className="relative mb-12 min-h-[420px]">
                <div 
                  ref={containerRef}
                  className="relative w-full cursor-grab active:cursor-grabbing overflow-hidden"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                  role="region"
                  aria-label="Team members carousel"
                  style={{ 
                    userSelect: 'none',
                    touchAction: 'pan-y'
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentMember}
                      initial={{ opacity: 0, x: 50, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.95 }}
                      transition={{
                        duration: 0.3,
                        ease: "easeInOut"
                      }}
                      className="flex justify-center"
                    >
                      <div className="w-full max-w-sm">
                        <Card 
                          hover={false}
                          tilt={false}
                          className="text-center h-full"
                        >
                          <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-brand-cyan/50">
                            <Image 
                              src={teamMembers[currentMember].image}
                              alt={teamMembers[currentMember].name}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <h4 className="text-white font-bold mb-1">{teamMembers[currentMember].name}</h4>
                          <p className="text-brand-cyan text-sm mb-2">{teamMembers[currentMember].role}</p>
                          <p className="text-text-muted text-xs mb-4 italic">{teamMembers[currentMember].credentials}</p>
                          
                          <div className="w-16 h-px bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent mx-auto mb-4" />
                          
                          <ul className="space-y-2">
                            {teamMembers[currentMember].details.map((detail, j) => (
                              <li key={j} className="text-text-muted text-xs flex items-center justify-center">
                                <span className="text-brand-lime mr-2">•</span>
                                <span className="text-center">{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Tablet/Desktop: Multi-card Layout */}
            {!isMobile && (
              <div className="relative mb-12 min-h-[400px]">
                <div className="flex justify-center items-center gap-6 lg:gap-8">
                  {teamMembers.map((member, index) => {
                    const relativeIndex = index - currentMember
                    let isVisible = false
                    let position: 'prev' | 'active' | 'next' = 'active'
                    
                    if (isTablet) {
                      // Tablet: show 3 cards out of 4 total with wrapping
                      if (relativeIndex >= -1 && relativeIndex <= 1) {
                        isVisible = true
                        if (relativeIndex === -1) position = 'prev'
                        else if (relativeIndex === 0) position = 'active'
                        else position = 'next'
                      }
                      // Handle wrapping: when at first member, show last member as prev
                      else if (relativeIndex === teamMembers.length - 1) {
                        isVisible = true
                        position = 'prev'
                      }
                      // Handle wrapping: when at last member, show first member as next
                      else if (relativeIndex === -(teamMembers.length - 1)) {
                        isVisible = true
                        position = 'next'
                      }
                    } else {
                      // Desktop: show 3 cards out of 4 total with wrapping
                      if (relativeIndex >= -1 && relativeIndex <= 1) {
                        isVisible = true
                        if (relativeIndex === -1) position = 'prev'
                        else if (relativeIndex === 0) position = 'active'
                        else position = 'next'
                      }
                      // Handle wrapping: when at first member, show last member as prev
                      else if (relativeIndex === teamMembers.length - 1) {
                        isVisible = true
                        position = 'prev'
                      }
                      // Handle wrapping: when at last member, show first member as next
                      else if (relativeIndex === -(teamMembers.length - 1)) {
                        isVisible = true
                        position = 'next'
                      }
                    }
                    
                    if (!isVisible) return null
                    
                    const isActive = position === 'active'
                    
                    return (
                      <motion.div
                        key={index}
                        className={`flex-shrink-0 cursor-pointer ${
                          isTablet ? 'w-80' : 'w-72 lg:w-80'
                        }`}
                        onClick={() => setCurrentMember(index)}
                        initial={false}
                        animate={{
                          opacity: isActive ? 1 : 0.7,
                          scale: isActive ? 1 : 0.95,
                        }}
                        transition={{
                          duration: 0.3,
                          ease: "easeOut",
                        }}
                      >
                        <Card 
                          hover={!isActive}
                          tilt={false}
                          className="text-center h-full"
                          style={{
                            borderColor: isActive ? 'rgba(56, 194, 214, 0.3)' : undefined,
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
                </div>
              </div>
            )}

            {/* Navigation Controls with Pagination */}
            <div className="flex items-center justify-center gap-4 mt-8">
              {/* Previous Button */}
              <button
                onClick={prevMember}
                disabled={isAnimating}
                className="carousel-nav-button w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cyan/20 backdrop-blur-md border border-brand-cyan/30 flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous team member"
              >
                <FaChevronLeft className="text-sm md:text-base" />
              </button>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2">
                {teamMembers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => !isAnimating && setCurrentMember(index)}
                    disabled={isAnimating}
                    className={`w-2 h-2 rounded-full transition-all duration-300 disabled:cursor-not-allowed ${
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
                disabled={isAnimating}
                className="carousel-nav-button w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-cyan/20 backdrop-blur-md border border-brand-cyan/30 flex items-center justify-center text-brand-cyan hover:bg-brand-cyan/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next team member"
              >
                <FaChevronRight className="text-sm md:text-base" />
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
                <h4 className="text-brand-lime font-bold mb-4">Core Team: 10 members (8 3D artists, 2 operations)</h4>
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


