import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Mail, Phone, MapPin, Globe, Linkedin } from "lucide-react";

interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string[];
}

interface Education {
  degree: string;
  institution: string;
  year: string;
}

interface CVData {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  certifications?: any[];
  projects?: any[];
  languages?: any[];
  volunteer?: any[];
  awards?: any[];
  publications?: any[];
  courses?: any[];
}

interface CVPreviewProps {
  data: CVData;
  onDownload?: () => void;
}

export function CVPreview({ data, onDownload }: CVPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">CV Preview</h2>
        <Button onClick={onDownload} data-testid="button-download-cv">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <Card className="max-w-3xl mx-auto shadow-2xl">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold" data-testid="text-cv-name">{data.name}</h1>
            <p className="text-lg text-muted-foreground">{data.title}</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                <span>{data.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                <span>{data.phone}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{data.location}</span>
              </div>
              {data.website && (
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  <span>{data.website}</span>
                </div>
              )}
              {data.linkedin && (
                <div className="flex items-center gap-1">
                  <Linkedin className="h-4 w-4" />
                  <span>{data.linkedin}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-2">Professional Summary</h2>
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-4">Experience</h2>
            <div className="space-y-4">
              {data.experience.map((exp, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{exp.title}</h3>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{exp.duration}</span>
                  </div>
                  {exp.description && Array.isArray(exp.description) && (
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {exp.description.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-lg font-semibold mb-4">Education</h2>
            <div className="space-y-3">
              {data.education.map((edu, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{edu.degree}</h3>
                    <p className="text-sm text-muted-foreground">{edu.institution}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{edu.year}</span>
                </div>
              ))}
            </div>
          </section>

          {data.certifications && data.certifications.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-4">Certifications</h2>
                <div className="space-y-3">
                  {data.certifications.map((cert: any, index: number) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{cert.name}</h3>
                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                        {cert.credentialId && (
                          <p className="text-xs text-muted-foreground mt-1">Credential ID: {cert.credentialId}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">{cert.date}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {data.projects && data.projects.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-4">Projects</h2>
                <div className="space-y-4">
                  {data.projects.map((project: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium">{project.title}</h3>
                        {project.date && <span className="text-sm text-muted-foreground">{project.date}</span>}
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                      )}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.map((tech: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{tech}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {data.languages && data.languages.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-3">Languages</h2>
                <div className="grid grid-cols-2 gap-3">
                  {data.languages.map((lang: any, index: number) => (
                    <div key={index}>
                      <h3 className="font-medium text-sm">{lang.language}</h3>
                      <p className="text-sm text-muted-foreground">{lang.proficiency}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {data.volunteer && data.volunteer.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-4">Volunteer Experience</h2>
                <div className="space-y-4">
                  {data.volunteer.map((vol: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{vol.role}</h3>
                          <p className="text-sm text-muted-foreground">{vol.organization}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{vol.duration}</span>
                      </div>
                      {vol.description && (
                        <p className="text-sm text-muted-foreground">{vol.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {data.awards && data.awards.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-4">Awards & Honors</h2>
                <div className="space-y-3">
                  {data.awards.map((award: any, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{award.title}</h3>
                          <p className="text-sm text-muted-foreground">{award.issuer}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{award.date}</span>
                      </div>
                      {award.description && (
                        <p className="text-sm text-muted-foreground">{award.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {data.publications && data.publications.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-4">Publications</h2>
                <div className="space-y-3">
                  {data.publications.map((pub: any, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{pub.title}</h3>
                          <p className="text-sm text-muted-foreground">{pub.publisher}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{pub.date}</span>
                      </div>
                      {pub.description && (
                        <p className="text-sm text-muted-foreground">{pub.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {data.courses && data.courses.length > 0 && (
            <>
              <Separator />
              <section>
                <h2 className="text-lg font-semibold mb-4">Courses</h2>
                <div className="space-y-3">
                  {data.courses.map((course: any, index: number) => (
                    <div key={index} className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{course.name}</h3>
                        <p className="text-sm text-muted-foreground">{course.institution}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{course.date}</span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
