import React, { useState } from 'react'
import { useEdgeFunctions } from '../hooks/useEdgeFunctions'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Loader2, Play, BookOpen, Video } from 'lucide-react'

export function AIGenerationDemo() {
  const [journalEntry, setJournalEntry] = useState('')
  const [generatedStory, setGeneratedStory] = useState('')
  const [videoId, setVideoId] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoStatus, setVideoStatus] = useState('')
  
  const { story, video } = useEdgeFunctions()

  const handleGenerateStory = async () => {
    if (!journalEntry.trim()) return

    const result = await story.generateStory({
      journalEntry: journalEntry.trim(),
      model: 'gpt-4',
      maxTokens: 300,
      temperature: 0.8
    })

    if (result.success && result.story) {
      setGeneratedStory(result.story)
    }
  }

  const handleGenerateVideo = async () => {
    if (!journalEntry.trim()) return

    const result = await video.generateFromJournal(journalEntry.trim())

    if (result.success && result.videoId) {
      setVideoId(result.videoId)
      setVideoStatus('processing')
      
      // Poll for completion
      const statusResult = await video.pollStatus(result.videoId)
      
      if (statusResult.success && statusResult.videoUrl) {
        setVideoUrl(statusResult.videoUrl)
        setVideoStatus('completed')
      } else {
        setVideoStatus('failed')
      }
    }
  }

  const handleGenerateVideoFromStory = async () => {
    if (!generatedStory) return

    const result = await video.generateVideo({
      prompt: generatedStory,
      negativePrompt: 'blurry, low quality, distorted, ugly, bad anatomy',
      width: 1024,
      height: 1024,
      numFrames: 24,
      fps: 8,
      guidanceScale: 7.5,
    })

    if (result.success && result.videoId) {
      setVideoId(result.videoId)
      setVideoStatus('processing')
      
      // Poll for completion
      const statusResult = await video.pollStatus(result.videoId)
      
      if (statusResult.success && statusResult.videoUrl) {
        setVideoUrl(statusResult.videoUrl)
        setVideoStatus('completed')
      } else {
        setVideoStatus('failed')
      }
    }
  }

  const resetAll = () => {
    setGeneratedStory('')
    setVideoId('')
    setVideoUrl('')
    setVideoStatus('')
    story.resetError()
    video.resetError()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AI Generation Demo</h1>
        <p className="text-muted-foreground">
          Test the secure Edge Functions for story and video generation
        </p>
      </div>

      {/* Journal Entry Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Journal Entry
          </CardTitle>
          <CardDescription>
            Enter your journal entry to generate a story or video
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Write your journal entry here..."
            value={journalEntry}
            onChange={(e) => setJournalEntry(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerateStory}
              disabled={story.isLoading || !journalEntry.trim()}
              className="flex items-center gap-2"
            >
              {story.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              Generate Story
            </Button>
            <Button 
              onClick={handleGenerateVideo}
              disabled={video.isLoading || !journalEntry.trim()}
              variant="outline"
              className="flex items-center gap-2"
            >
              {video.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              Generate Video
            </Button>
            <Button onClick={resetAll} variant="ghost">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {(story.error || video.error) && (
        <Alert variant="destructive">
          <AlertDescription>
            {story.error || video.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Generated Story */}
      {generatedStory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Generated Story
            </CardTitle>
            <CardDescription>
              AI-generated story based on your journal entry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{generatedStory}</p>
            </div>
            <Button 
              onClick={handleGenerateVideoFromStory}
              disabled={video.isLoading}
              className="flex items-center gap-2"
            >
              {video.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Generate Video from Story
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Video Status */}
      {videoId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Generation
            </CardTitle>
            <CardDescription>
              Status: {videoStatus}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={videoStatus === 'completed' ? 'default' : 'secondary'}>
                  {videoStatus}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {videoId}
                </span>
              </div>
              
              {videoStatus === 'processing' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating video... This may take a few minutes.
                </div>
              )}
              
              {videoStatus === 'completed' && videoUrl && (
                <div className="space-y-2">
                  <video 
                    controls 
                    className="w-full max-w-md rounded-lg"
                    src={videoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <a 
                    href={videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open video in new tab
                  </a>
                </div>
              )}
              
              {videoStatus === 'failed' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Video generation failed. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. <strong>Generate Story:</strong> Enter a journal entry and click "Generate Story" to create a creative narrative using OpenAI.</p>
          <p>2. <strong>Generate Video:</strong> Click "Generate Video" to create a video from your journal entry using Runway Gen-2.</p>
          <p>3. <strong>Story to Video:</strong> After generating a story, you can create a video based on that story.</p>
          <p>4. <strong>API Keys:</strong> Make sure your OpenAI and Runway API keys are set as Supabase secrets.</p>
        </CardContent>
      </Card>
    </div>
  )
} 