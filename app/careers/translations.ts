export type Lang = 'en' | 'vn'

export const t = {
  en: {
    heroLabel: 'Careers · 2026',
    heroHeadline: ["WE'RE HIRING", 'CREATIVES.'],
    metaItems: [
      { label: 'Studio', value: 'Anim-8' },
      { label: 'Location', value: 'District 3, Ho Chi Minh City' },
      { label: 'Clients', value: 'U.S.-based Global Projects' },
      { label: 'Open Roles', value: '5 Positions' },
    ],
    metaInstagram: 'Instagram',
    rolesNav: [
      { id: 'designer', label: 'Designer · Full-Time' },
      { id: 'design-intern', label: 'Design Intern' },
      { id: '3d-modeler', label: '3D Modeler / Generalist' },
      { id: 'storyboard', label: 'Storyboard & Concept Artist' },
      { id: 'video-editor', label: 'Video Editor / VFX Artist' },
    ],

    // ── ROLE 1 ─────────────────────────────────────────────
    designer: {
      tag: 'Full-Time',
      title: 'DESIGNER',
      comp: 'VND 10–25M / month · + Performance Bonuses',
      badge: 'Brand Identity\n& Visual Systems',
      overview: {
        label: 'Role Overview',
        body: "We're hiring a Designer focused on brand identity and visual design systems for U.S. clients. You'll build end-to-end brand identities—from visual direction through to polished, handoff-ready systems—working closely with a fast-moving creative team.",
        boldWord: 'brand identity',
      },
      do: {
        label: "What You'll Do",
        items: [
          'Build and develop brand identities: visual direction, key visuals, and brand guideline systems.',
          'Create and refine logos (concept → iterations → final) and all logo applications.',
          'Work deeply with typography: hierarchy, grid systems, spacing, kerning, editorial layout.',
          'Develop and maintain color systems: palettes, contrast, consistency, and brand tone.',
          'Produce brand-consistent assets: social visuals, pitch decks, landing visuals, packaging.',
          'Collaborate to translate brand systems into digital UI foundations.',
          'Present design rationale clearly and iterate quickly based on feedback.',
        ],
      },
      looking: {
        label: "What We're Looking For",
        items: [
          'Strong foundation in brand identity, typography, logo design, and color theory.',
          'Taste for modern, clean, system-driven design with high attention to detail.',
          'Proficient in Figma and/or Adobe tools (Illustrator / Photoshop / InDesign) or equivalent.',
          'Comfortable receiving feedback, iterating fast, and learning proactively.',
          'UI/UX is a plus (layout for web/app, design systems, basic UX thinking).',
        ],
      },
    },

    // ── ROLE 2 ─────────────────────────────────────────────
    intern: {
      tag: 'Part-Time / Full-Time Internship',
      title: 'DESIGN INTERN',
      comp: 'Stipend + Project-Based Bonus · Flexible Schedule',
      badge: 'Branding\n& Craft',
      about: {
        label: 'About This Role',
        body: "A hands-on internship where you'll support live brand projects—not busy work. Schedule is flexible to fit your school commitments. Compensation includes a stipend plus project-based bonuses discussed at interview.",
      },
      do: {
        label: "What You'll Learn & Do",
        items: [
          'Support real brand identity projects: moodboards, visual exploration, key visuals.',
          'Practice typography and layout craft: hierarchy, grid systems, spacing and alignment.',
          'Assist in building brand systems: templates, guidelines, and handoff-ready files.',
          'Help execute logo applications and brand-consistent assets (social templates, decks, etc.).',
          'Plus: If you have UI experience, you may help with basic web/app layout work.',
        ],
      },
      looking: {
        label: "What We're Looking For",
        items: [
          'A CV + portfolio (school or personal projects welcome) showing taste and fundamentals.',
          'Strong interest in branding and a desire to grow in typography, logo, and color.',
          'Coachable, detail-oriented, creative, a lifelong learner, and proactive in work.',
        ],
      },
    },

    // ── ROLE 3 ─────────────────────────────────────────────
    modeler: {
      tag: 'Full-Time',
      title: '3D MODELER / GENERALIST',
      comp: '$700–$1,200 USD / month · + Bonus',
      badge: 'Materials\nSpecialist',
      overview: {
        label: 'Position Overview',
        body: "We're seeking a versatile 3D Modeler / Generalist with strong materials and texturing expertise to support our social media and cinematic content pipeline. This role requires someone who can seamlessly transition between modeling, texturing, and technical implementation while maintaining strict adherence to concept art. The ideal candidate excels at bringing 2D concepts to life through detailed 3D assets optimized for real-time rendering.",
        boldPhrase: 'strong materials and texturing expertise',
      },
      modeling: {
        label: '3D Modeling & Asset Creation',
        items: [
          'Create high-quality 3D models from concept art, maintaining artistic vision and style consistency.',
          'Model characters, props, environments, and vehicles across styles (realistic to stylized).',
          'Develop efficient topology for animation-ready assets and real-time rendering.',
          'Iterate quickly on modeling to match evolving artistic direction.',
          'Create both hero assets for close-up shots and optimized background elements.',
        ],
      },
      materials: {
        label: 'Materials & Texturing (Primary Focus)',
        items: [
          'Lead responsibility: develop compelling materials and textures using Substance Painter (+ Designer).',
          'Create PBR materials that work seamlessly across different lighting conditions.',
          'Master both hand-painted and photorealistic texturing approaches.',
          'Develop material libraries and texture standards for consistent look across projects.',
          'Optimize texture resolution and compression for various delivery formats.',
        ],
      },
      pipeline: {
        label: 'Technical Pipeline Integration',
        items: [
          'Prepare assets for export via FBX pipeline from Blender/Maya to Unreal Engine.',
          'Set up materials and shaders in Unreal Engine for real-time performance.',
          'Collaborate with lighting artists to ensure materials respond correctly.',
          'Troubleshoot material and rendering issues across the pipeline.',
          'Maintain organized asset libraries and naming conventions.',
        ],
      },
      qualifications: {
        label: 'Required Qualifications',
        items: [
          '3+ years of professional 3D modeling and texturing experience.',
          'Essential: Advanced proficiency in Substance Painter; strong skills in Blender, ZBrush, and Maya.',
          'Essential: Experience with Unreal Engine material editor and real-time rendering.',
          'Solid understanding of PBR (Physically Based Rendering) workflows.',
          'Portfolio demonstrating versatility, materials expertise, and concept adherence.',
        ],
      },
      software: {
        label: 'Software Proficiency',
        expertLabel: 'Expert Level',
        midLabel: 'Intermediate',
        niceLabel: 'Beneficial',
      },
      portfolio: {
        label: 'Portfolio Requirements',
        items: [
          '3D models created from concept art with before/after comparisons.',
          'Materials and texturing work showcasing various styles and techniques.',
          'Examples of assets optimized for real-time engines.',
          'Breakdown of your modeling and texturing process.',
          'Evidence of style versatility and concept adherence.',
          'Technical wireframes and topology examples.',
        ],
      },
    },

    // ── ROLE 4 ─────────────────────────────────────────────
    storyboard: {
      tag: 'Full-Time',
      title: 'STORYBOARD & CONCEPT ARTIST',
      comp: 'VND 15–25M / month · Based on Experience & Portfolio',
      badge: 'Visual\nStorytelling',
      overview: {
        label: 'Overview',
        body: "Are you passionate about visual storytelling, social media content, and bringing ideas to life through concept illustration and storyboards? If you enjoy collaborating in a fast-paced creative environment and are comfortable with English, this role could be a great fit.",
      },
      do: {
        label: "What You'll Do",
        items: [
          'Develop storyboards that translate scripts or ideas into clear visual sequences.',
          'Create concept art and visual explorations to support storytelling and creative direction.',
          'Design scenes, compositions, and character interactions that communicate narrative flow.',
          'Collaborate with directors and creative teams to refine visual storytelling.',
          'Produce sketches, rough boards, and presentation-ready frames for animation or digital content.',
          'Support content creation for social media, digital entertainment, and online storytelling.',
          'Iterate quickly based on feedback from international teams.',
        ],
      },
      looking: {
        label: "What We're Looking For",
        items: [
          'Strong storytelling ability through drawing and composition.',
          'Portfolio demonstrating storyboards, concept art, or visual narrative work.',
          'Good understanding of cinematic framing, pacing, and scene continuity.',
          'Ability to read and write English for communication with international teams.',
          'Proficiency in Photoshop, Procreate, Clip Studio, or similar illustration software.',
          'Ability to work collaboratively and adapt to creative feedback.',
        ],
      },
      bonus: {
        label: 'Bonus If You Have',
        items: [
          'Experience with animation pipelines or animatics.',
          'Understanding of content creation for YouTube or social media storytelling.',
          'Basic knowledge of character design or environment concept art.',
        ],
      },
    },

    // ── ROLE 5 ─────────────────────────────────────────────
    video: {
      tag: 'Internship · Junior · Senior — Full-Time',
      title: 'VIDEO EDITOR / VFX ARTIST',
      comp: 'Based on Level & Experience',
      badge: 'Post-Production\n& VFX',
      overview: {
        label: 'Role Overview',
        body: "ANIM-8 Studios is expanding our creative team and looking for Video Editors and VFX Artists to join upcoming projects. You'll work closely with creative directors, producers, and editors to produce high-quality video content for global clients — including social media, branded content, and digital entertainment. Depending on your strengths, you may focus primarily on editing or VFX, while collaborating with artists across the pipeline.",
      },
      editor: {
        label: 'Position 1 — Video Editor',
        responsibilities: {
          label: 'Responsibilities',
          items: [
            'Edit video content for social media, branded campaigns, and digital storytelling projects.',
            'Assemble footage, sound, graphics, and visual elements into compelling narratives.',
            'Work with creative briefs and collaborate with directors and producers to achieve the intended visual style.',
            'Ensure smooth pacing, rhythm, and storytelling flow in the final edit.',
            'Handle technical aspects of editing workflows and project organization.',
          ],
        },
        requirements: {
          label: 'Requirements',
          items: [
            'Proficiency in Adobe Premiere Pro.',
            'Familiarity with After Effects and basic DaVinci Resolve workflows.',
            'Understanding of editing rhythm, music timing, and visual storytelling.',
            'Basic knowledge of Adobe Photoshop and Illustrator.',
            'Ability to understand project briefs and communicate in English.',
          ],
        },
      },
      vfx: {
        label: 'Position 2 — VFX Artist',
        responsibilities: {
          label: 'Responsibilities',
          items: [
            'Prepare and execute visual effects elements for video content.',
            'Perform tracking, rotoscoping, cleanup, and keying tasks.',
            'Create simple 2D motion graphics and compositing elements.',
            'Collaborate with editors and creative teams to integrate VFX seamlessly into video content.',
          ],
        },
        requirements: {
          label: 'Requirements',
          items: [
            'Experience with After Effects.',
            'Understanding of VFX preparation workflows (tracking, roto, clean-up, keying).',
            'Basic 2D motion graphics skills.',
            'Ability to work collaboratively and iterate quickly based on feedback.',
          ],
        },
      },
      general: {
        label: 'General Requirements',
        items: [
          '1+ year of experience in video editing, VFX, or related fields (MV/TVC experience is a plus).',
          'Ability to understand creative briefs and communicate in English.',
          'Strong teamwork skills, proactive attitude, and positive work ethic.',
          'Curiosity and willingness to research, experiment, and continuously improve.',
          'Portfolio demonstrating relevant work.',
        ],
      },
    },

    // ── ABOUT ──────────────────────────────────────────────
    about: {
      sectionTitle: 'ABOUT ANIM-8',
      studioInfo: {
        label: 'Studio Info',
        items: [
          '02 Truong Quyen, District 3, Ho Chi Minh City, Vietnam',
          'Monday to Friday · 8:00–12:00 & 13:00–17:00',
          'U.S.-based creative studio with HCMC office · Global clients',
        ],
        instagramLabel: '@anim8.studios on Instagram ↗',
        description:
          'Anim-8 builds communities through innovative animation, interactive experiences, and physical products. We pioneer new approaches to multi-platform storytelling and cross-cultural collaboration—building content infrastructure for the AI era.',
      },
      leadership: { label: 'Creative Leadership' },
      team: { label: 'Production Team' },
      benefits: {
        label: 'Benefits',
        items: [
          { title: 'Performance Bonuses', desc: 'Project-based and performance bonuses on top of base salary.', highlight: true as boolean },
          { title: 'Equipment & Software', desc: 'Hardware and software support as needed, including high-end tools and graphics tablets.', highlight: false as boolean },
          { title: 'U.S. Client Exposure', desc: 'Work directly with U.S. directors and creative leadership on global projects.', highlight: false as boolean },
          { title: 'Training & Growth', desc: 'Training course support and professional development budget included.', highlight: false as boolean },
          { title: 'Leave & Holidays', desc: 'Public holiday / Tet leave, team trips, and team-building per Vietnamese regulations.', highlight: false as boolean },
          { title: 'Creative Culture', desc: 'A professional environment built on respect, creativity, and lifelong learning.', highlight: false as boolean },
        ],
      },
    },

    /** Link from each role block → `/apply?role=…#field-role` */
    roleApply: 'Apply',

    // ── CTA ────────────────────────────────────────────────
    cta: {
      label: 'Ready to Apply?',
      headline: ["LET'S MAKE", 'SOMETHING GREAT.'],
      sub: 'Send your portfolio and CV to the Anim-8 team. We review every application personally.',
      button: 'Send Your CV & Portfolio',
    },
  },

  // ════════════════════════════════════════════════════════
  // VIETNAMESE
  // ════════════════════════════════════════════════════════
  vn: {
    heroLabel: 'Tuyển Dụng · 2026',
    heroHeadline: ['CHÚNG TÔI', 'ĐANG TUYỂN DỤNG.'],
    metaItems: [
      { label: 'Xưởng Phim', value: 'Anim-8' },
      { label: 'Địa Chỉ', value: 'Quận 3, TP. Hồ Chí Minh' },
      { label: 'Khách Hàng', value: 'Dự Án Quốc Tế (Hoa Kỳ)' },
      { label: 'Vị Trí Mở', value: '5 Vị Trí' },
    ],
    metaInstagram: 'Instagram',
    rolesNav: [
      { id: 'designer', label: 'Designer · Toàn Thời Gian' },
      { id: 'design-intern', label: 'Design Intern' },
      { id: '3d-modeler', label: '3D Modeler / Generalist' },
      { id: 'storyboard', label: 'Storyboard & Concept Artist' },
      { id: 'video-editor', label: 'Video Editor / VFX Artist' },
    ],

    // ── ROLE 1 ─────────────────────────────────────────────
    designer: {
      tag: 'Toàn Thời Gian',
      title: 'DESIGNER',
      comp: '10–25 triệu VNĐ / tháng · + Thưởng Hiệu Suất',
      badge: 'Nhận Diện Thương Hiệu\n& Hệ Thống Hình Ảnh',
      overview: {
        label: 'Tổng Quan Vị Trí',
        body: 'Chúng tôi đang tuyển dụng một Họa Sĩ Thiết Kế tập trung vào nhận diện thương hiệu và hệ thống thiết kế hình ảnh cho các khách hàng tại Hoa Kỳ. Bạn sẽ xây dựng bộ nhận diện thương hiệu từ đầu đến cuối—từ định hướng hình ảnh đến các hệ thống hoàn chỉnh, sẵn sàng bàn giao—làm việc cùng một đội ngũ sáng tạo năng động.',
        boldWord: 'nhận diện thương hiệu',
      },
      do: {
        label: 'Công Việc Cụ Thể',
        items: [
          'Xây dựng và phát triển nhận diện thương hiệu: định hướng hình ảnh, key visual, và hệ thống brand guideline.',
          'Tạo và tinh chỉnh logo (concept → phác thảo → hoàn chỉnh) và tất cả các ứng dụng logo.',
          'Làm việc chuyên sâu với typography: phân cấp chữ, hệ thống grid, khoảng cách, kerning, bố cục editorial.',
          'Phát triển và duy trì hệ thống màu sắc: bảng màu, độ tương phản, nhất quán và tông màu thương hiệu.',
          'Sản xuất tài sản thiết kế: ảnh mạng xã hội, pitch deck, hình ảnh landing page, bao bì (tùy dự án).',
          'Phối hợp chuyển đổi hệ thống thương hiệu thành nền tảng UI kỹ thuật số.',
          'Trình bày lý do thiết kế rõ ràng và lặp lại nhanh chóng dựa trên phản hồi.',
        ],
      },
      looking: {
        label: 'Yêu Cầu Ứng Viên',
        items: [
          'Nền tảng vững chắc về nhận diện thương hiệu, typography, thiết kế logo và lý thuyết màu sắc.',
          'Có gu thẩm mỹ hiện đại, tinh tế, có hệ thống và chú trọng chi tiết.',
          'Thành thạo Figma và/hoặc các công cụ Adobe (Illustrator / Photoshop / InDesign) hoặc tương đương.',
          'Thoải mái nhận phản hồi, lặp lại nhanh và học hỏi chủ động.',
          'UI/UX là điểm cộng (bố cục web/app, hệ thống thiết kế, tư duy UX cơ bản).',
        ],
      },
    },

    // ── ROLE 2 ─────────────────────────────────────────────
    intern: {
      tag: 'Thực Tập Bán / Toàn Thời Gian',
      title: 'DESIGN INTERN',
      comp: 'Phụ Cấp + Thưởng Theo Dự Án · Lịch Linh Hoạt',
      badge: 'Thương Hiệu\n& Kỹ Năng',
      about: {
        label: 'Về Vị Trí Này',
        body: 'Một kỳ thực tập thực chiến, nơi bạn sẽ hỗ trợ các dự án thương hiệu thực tế—không phải công việc vặt. Lịch làm việc linh hoạt phù hợp với thời gian học tập. Phụ cấp và thưởng theo dự án sẽ được trao đổi khi phỏng vấn.',
      },
      do: {
        label: 'Bạn Sẽ Học & Làm Gì',
        items: [
          'Hỗ trợ các dự án nhận diện thương hiệu thực tế: moodboard, khám phá hình ảnh, key visual.',
          'Rèn luyện kỹ năng typography và bố cục: phân cấp chữ, hệ thống grid, khoảng cách và căn chỉnh.',
          'Hỗ trợ xây dựng hệ thống thương hiệu: template, brand guideline và file bàn giao.',
          'Giúp thực hiện các ứng dụng logo và tài sản thiết kế nhất quán (template mạng xã hội, deck, v.v.).',
          'Cộng thêm: Nếu bạn có kinh nghiệm UI, bạn có thể hỗ trợ công việc bố cục web/app cơ bản.',
        ],
      },
      looking: {
        label: 'Yêu Cầu Ứng Viên',
        items: [
          'CV + portfolio (dự án trường học hoặc cá nhân đều được chấp nhận) thể hiện gu thẩm mỹ và nền tảng.',
          'Quan tâm mạnh đến branding và mong muốn phát triển về typography, logo và màu sắc.',
          'Biết lắng nghe, chú ý đến chi tiết, sáng tạo, ham học hỏi và chủ động trong công việc.',
        ],
      },
    },

    // ── ROLE 3 ─────────────────────────────────────────────
    modeler: {
      tag: 'Toàn Thời Gian',
      title: '3D MODELER / GENERALIST',
      comp: '$700–$1.200 USD / tháng · + Thưởng',
      badge: 'Chuyên Gia\nVật Liệu',
      overview: {
        label: 'Tổng Quan Vị Trí',
        body: 'Chúng tôi đang tìm kiếm một Họa Sĩ 3D / Tổng Hợp đa năng với chuyên môn mạnh về vật liệu và texture để hỗ trợ pipeline nội dung mạng xã hội và điện ảnh của chúng tôi. Vị trí này yêu cầu khả năng chuyển đổi linh hoạt giữa modeling, texturing và tích hợp kỹ thuật, đồng thời tuân thủ chặt chẽ concept art. Ứng viên lý tưởng có khả năng đưa concept 2D thành tài sản 3D chi tiết, tối ưu cho rendering thời gian thực.',
        boldPhrase: 'chuyên môn mạnh về vật liệu và texture',
      },
      modeling: {
        label: 'Dựng Hình 3D & Tạo Tài Sản',
        items: [
          'Tạo mô hình 3D chất lượng cao từ concept art, duy trì tầm nhìn nghệ thuật và tính nhất quán về phong cách.',
          'Dựng hình nhân vật, đạo cụ, môi trường và phương tiện theo nhiều phong cách (realistic đến stylized).',
          'Phát triển topology hiệu quả cho tài sản sẵn sàng rig và rendering thời gian thực.',
          'Lặp lại nhanh chóng theo định hướng nghệ thuật đang thay đổi.',
          'Tạo cả tài sản hero cho cảnh cận và các thành phần nền được tối ưu.',
        ],
      },
      materials: {
        label: 'Vật Liệu & Texturing (Trọng Tâm Chính)',
        items: [
          'Trách nhiệm chính: phát triển vật liệu và texture hấp dẫn bằng Substance Painter (+ Designer).',
          'Tạo vật liệu PBR hoạt động liền mạch trong các điều kiện ánh sáng khác nhau.',
          'Thành thạo cả phương pháp texturing vẽ tay và chụp ảnh thực tế.',
          'Phát triển thư viện vật liệu và tiêu chuẩn texture cho giao diện nhất quán.',
          'Tối ưu hóa độ phân giải và nén texture cho các định dạng phân phối khác nhau.',
        ],
      },
      pipeline: {
        label: 'Tích Hợp Pipeline Kỹ Thuật',
        items: [
          'Chuẩn bị tài sản xuất khẩu qua pipeline FBX từ Blender/Maya sang Unreal Engine.',
          'Thiết lập vật liệu và shader trong Unreal Engine cho hiệu suất thời gian thực.',
          'Phối hợp với các họa sĩ ánh sáng để đảm bảo vật liệu phản ứng đúng.',
          'Khắc phục sự cố vật liệu và rendering trong pipeline.',
          'Duy trì thư viện tài sản và quy ước đặt tên có tổ chức.',
        ],
      },
      qualifications: {
        label: 'Yêu Cầu Bắt Buộc',
        items: [
          '3+ năm kinh nghiệm chuyên nghiệp về dựng hình 3D và texturing.',
          'Bắt buộc: Thành thạo Substance Painter; kỹ năng mạnh về Blender, ZBrush và Maya.',
          'Bắt buộc: Kinh nghiệm với Unreal Engine material editor và rendering thời gian thực.',
          'Hiểu biết vững về quy trình PBR (Physically Based Rendering).',
          'Portfolio thể hiện sự đa dạng, chuyên môn vật liệu và tuân thủ concept.',
        ],
      },
      software: {
        label: 'Thành Thạo Phần Mềm',
        expertLabel: 'Cấp Độ Chuyên Gia',
        midLabel: 'Cấp Độ Trung Bình',
        niceLabel: 'Là Điểm Cộng',
      },
      portfolio: {
        label: 'Yêu Cầu Portfolio',
        items: [
          'Mô hình 3D tạo từ concept art với so sánh trước/sau.',
          'Công việc vật liệu và texturing thể hiện nhiều phong cách và kỹ thuật.',
          'Ví dụ về tài sản được tối ưu cho engine thời gian thực.',
          'Phân tích quy trình dựng hình và texturing của bạn.',
          'Bằng chứng về sự đa dạng phong cách và tuân thủ concept.',
          'Ví dụ wireframe kỹ thuật và topology.',
        ],
      },
    },

    // ── ROLE 4 ─────────────────────────────────────────────
    storyboard: {
      tag: 'Toàn Thời Gian',
      title: 'STORYBOARD & CONCEPT ARTIST',
      comp: '15–25 triệu VNĐ / tháng · Dựa Trên Kinh Nghiệm & Portfolio',
      badge: 'Kể Chuyện\nBằng Hình Ảnh',
      overview: {
        label: 'Tổng Quan',
        body: 'Bạn có đam mê với kể chuyện bằng hình ảnh, nội dung mạng xã hội và hiện thực hóa ý tưởng qua minh họa concept và storyboard không? Nếu bạn thích làm việc trong môi trường sáng tạo năng động và thoải mái với tiếng Anh, đây có thể là vị trí dành cho bạn.',
      },
      do: {
        label: 'Công Việc Cụ Thể',
        items: [
          'Phát triển storyboard chuyển đổi kịch bản hoặc ý tưởng thành chuỗi hình ảnh rõ ràng.',
          'Tạo concept art và khám phá hình ảnh để hỗ trợ kể chuyện và định hướng sáng tạo.',
          'Thiết kế cảnh, bố cục và tương tác nhân vật truyền đạt luồng tường thuật.',
          'Phối hợp với đạo diễn và đội sáng tạo để tinh chỉnh kể chuyện bằng hình ảnh.',
          'Tạo phác thảo, rough board và frame sẵn sàng trình bày cho nội dung animation hoặc kỹ thuật số.',
          'Hỗ trợ tạo nội dung cho mạng xã hội, giải trí kỹ thuật số và storytelling trực tuyến.',
          'Lặp lại nhanh chóng dựa trên phản hồi từ các đội quốc tế.',
        ],
      },
      looking: {
        label: 'Yêu Cầu Ứng Viên',
        items: [
          'Khả năng kể chuyện mạnh mẽ qua hình vẽ và bố cục.',
          'Portfolio thể hiện storyboard, concept art hoặc công việc tường thuật hình ảnh.',
          'Hiểu biết tốt về framing điện ảnh, nhịp độ và tính liên tục cảnh.',
          'Khả năng đọc và viết tiếng Anh để giao tiếp với các đội quốc tế.',
          'Thành thạo Photoshop, Procreate, Clip Studio hoặc phần mềm minh họa tương tự.',
          'Khả năng làm việc cộng tác và thích ứng với phản hồi sáng tạo.',
        ],
      },
      bonus: {
        label: 'Điểm Cộng Nếu Bạn Có',
        items: [
          'Kinh nghiệm với pipeline animation hoặc animatic.',
          'Hiểu biết về tạo nội dung cho YouTube hoặc storytelling mạng xã hội.',
          'Kiến thức cơ bản về thiết kế nhân vật hoặc concept art môi trường.',
        ],
      },
    },

    // ── ROLE 5 ─────────────────────────────────────────────
    video: {
      tag: 'Thực Tập · Junior · Senior — Toàn Thời Gian',
      title: 'VIDEO EDITOR / VFX ARTIST',
      comp: 'Theo Cấp Độ & Kinh Nghiệm',
      badge: 'Hậu Kỳ\n& VFX',
      overview: {
        label: 'Tổng Quan Vị Trí',
        body: 'Anim-8 Studios đang mở rộng đội ngũ sáng tạo và tìm kiếm Biên Tập Viên Video và Họa Sĩ VFX để tham gia các dự án sắp tới. Bạn sẽ làm việc chặt chẽ với đạo diễn sáng tạo, nhà sản xuất và các biên tập viên để tạo ra nội dung video chất lượng cao cho khách hàng toàn cầu — bao gồm mạng xã hội, nội dung thương hiệu và giải trí kỹ thuật số. Tùy vào thế mạnh, bạn có thể tập trung vào biên tập hoặc VFX, đồng thời cộng tác với các họa sĩ trên toàn pipeline.',
      },
      editor: {
        label: 'Vị Trí 1 — Biên Tập Viên Video',
        responsibilities: {
          label: 'Công Việc Cụ Thể',
          items: [
            'Biên tập nội dung video cho mạng xã hội, chiến dịch thương hiệu và dự án kể chuyện kỹ thuật số.',
            'Lắp ráp cảnh quay, âm thanh, đồ họa và các yếu tố hình ảnh thành câu chuyện hấp dẫn.',
            'Làm việc với brief sáng tạo và phối hợp với đạo diễn, nhà sản xuất để đạt phong cách hình ảnh mong muốn.',
            'Đảm bảo nhịp độ, tiết tấu và luồng kể chuyện mượt mà trong bản edit cuối.',
            'Xử lý các khía cạnh kỹ thuật của quy trình biên tập và tổ chức dự án.',
          ],
        },
        requirements: {
          label: 'Yêu Cầu',
          items: [
            'Thành thạo Adobe Premiere Pro.',
            'Quen thuộc với After Effects và quy trình DaVinci Resolve cơ bản.',
            'Hiểu biết về nhịp điệu biên tập, thời điểm âm nhạc và kể chuyện bằng hình ảnh.',
            'Kiến thức cơ bản về Adobe Photoshop và Illustrator.',
            'Khả năng hiểu brief dự án và giao tiếp bằng tiếng Anh.',
          ],
        },
      },
      vfx: {
        label: 'Vị Trí 2 — Họa Sĩ VFX',
        responsibilities: {
          label: 'Công Việc Cụ Thể',
          items: [
            'Chuẩn bị và thực hiện các yếu tố hiệu ứng hình ảnh cho nội dung video.',
            'Thực hiện tracking, rotoscoping, dọn dẹp và keying.',
            'Tạo đồ họa chuyển động 2D đơn giản và các yếu tố compositing.',
            'Phối hợp với biên tập viên và đội sáng tạo để tích hợp VFX liền mạch vào nội dung video.',
          ],
        },
        requirements: {
          label: 'Yêu Cầu',
          items: [
            'Kinh nghiệm với After Effects.',
            'Hiểu biết về quy trình chuẩn bị VFX (tracking, roto, dọn dẹp, keying).',
            'Kỹ năng đồ họa chuyển động 2D cơ bản.',
            'Khả năng làm việc cộng tác và lặp lại nhanh dựa trên phản hồi.',
          ],
        },
      },
      general: {
        label: 'Yêu Cầu Chung',
        items: [
          '1+ năm kinh nghiệm biên tập video, VFX hoặc lĩnh vực liên quan (kinh nghiệm MV/TVC là điểm cộng).',
          'Khả năng hiểu brief sáng tạo và giao tiếp bằng tiếng Anh.',
          'Kỹ năng làm việc nhóm tốt, thái độ chủ động và đạo đức làm việc tích cực.',
          'Tò mò và sẵn sàng nghiên cứu, thử nghiệm và liên tục cải thiện.',
          'Portfolio thể hiện các công việc liên quan.',
        ],
      },
    },

    // ── ABOUT ──────────────────────────────────────────────
    about: {
      sectionTitle: 'VỀ ANIM-8',
      studioInfo: {
        label: 'Thông Tin Xưởng Phim',
        items: [
          '02 Trương Quyền, Quận 3, TP. Hồ Chí Minh, Việt Nam',
          'Thứ Hai đến Thứ Sáu · 8:00–12:00 & 13:00–17:00',
          'Xưởng phim gốc Hoa Kỳ với văn phòng tại TP.HCM · Khách hàng toàn cầu',
        ],
        instagramLabel: '@anim8.studios trên Instagram ↗',
        description:
          'Anim-8 xây dựng cộng đồng thông qua animation sáng tạo, trải nghiệm tương tác và sản phẩm vật lý. Chúng tôi tiên phong các cách tiếp cận mới trong kể chuyện đa nền tảng và hợp tác xuyên văn hóa—xây dựng cơ sở hạ tầng nội dung cho kỷ nguyên AI.',
      },
      leadership: { label: 'Ban Lãnh Đạo Sáng Tạo' },
      team: { label: 'Đội Sản Xuất' },
      benefits: {
        label: 'Quyền Lợi',
        items: [
          { title: 'Thưởng Hiệu Suất', desc: 'Thưởng theo dự án và hiệu suất ngoài lương cơ bản.', highlight: true as boolean },
          { title: 'Thiết Bị & Phần Mềm', desc: 'Hỗ trợ phần cứng và phần mềm theo nhu cầu, bao gồm công cụ cao cấp và máy tính bảng đồ họa.', highlight: false as boolean },
          { title: 'Tiếp Cận Khách Hàng Hoa Kỳ', desc: 'Làm việc trực tiếp với đạo diễn và lãnh đạo sáng tạo Hoa Kỳ trong các dự án toàn cầu.', highlight: false as boolean },
          { title: 'Đào Tạo & Phát Triển', desc: 'Hỗ trợ chi phí khóa đào tạo và ngân sách phát triển nghề nghiệp.', highlight: false as boolean },
          { title: 'Nghỉ Phép & Lễ Tết', desc: 'Nghỉ lễ / Tết, team trip và team building theo quy định Việt Nam.', highlight: false as boolean },
          { title: 'Văn Hóa Sáng Tạo', desc: 'Môi trường chuyên nghiệp được xây dựng trên sự tôn trọng, sáng tạo và học hỏi suốt đời.', highlight: false as boolean },
        ],
      },
    },

    roleApply: 'Ứng tuyển',

    // ── CTA ────────────────────────────────────────────────
    cta: {
      label: 'Sẵn Sàng Ứng Tuyển?',
      headline: ['HÃY CÙNG TẠO RA', 'ĐIỀU TUYỆT VỜI.'],
      sub: 'Gửi portfolio và CV của bạn cho đội ngũ Anim-8. Chúng tôi xem xét mọi đơn ứng tuyển một cách cá nhân.',
      button: 'Gửi CV & Portfolio',
    },
  },
} as const

export type Translations = typeof t.en
