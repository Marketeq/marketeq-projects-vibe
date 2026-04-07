/**
 * Editorial content for category pages
 * Populated from CMS service (currently mocked)
 * @see CmsAdapter.getEditorial()
 */

export interface EditorialContent {
    /**
     * SEO overrides from Strapi (optional)
     * Takes precedence over category's default SEO
     */
    seoOverride?: {
      title?: string;
      description?: string;
      canonical?: string;
    };
  
    /**
     * Hero section at top of category page
     */
    hero?: {
      title: string;
      subtitle?: string;
      image: string;
      link?: string;
    };
  
    /**
     * Featured guides/tutorials
     */
    guides?: EditorialGuide[];
  
    /**
     * Featured courses
     */
    courses?: EditorialCourse[];
  
    /**
     * Frequently asked questions
     */
    faq?: EditorialFAQ[];
  }
  
  export interface EditorialGuide {
    id: string;
    title: string;
    description?: string;
    link: string;
    thumbnail?: string;
  }
  
  export interface EditorialCourse {
    id: string;
    title: string;
    description?: string;
    link: string;
    thumbnail?: string;
    duration?: string;
  }
  
  export interface EditorialFAQ {
    question: string;
    answer: string;
  }