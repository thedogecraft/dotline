import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.JSX.Element {
    if (this.state.hasError && this.state.error) {
      const errorMessage =
        this.state.error instanceof Error ? this.state.error.message : String(this.state.error)
      const errorStack = this.state.error instanceof Error ? this.state.error.stack : undefined

      return (
        <div className="flex flex-col h-screen bg-background text-foreground items-center justify-center p-8">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Dotline encountered an unexpected error. You can try again or check the developer
                console for details.
              </p>
              <pre className="p-4 rounded-lg bg-muted text-xs text-foreground overflow-x-auto overflow-y-auto max-h-40 border select-all">
                {errorMessage}
                {errorStack && `\n\n${errorStack}`}
              </pre>
            </CardContent>
            <CardFooter>
              <Button onClick={this.handleRetry}>Try Again</Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children as React.JSX.Element
  }
}

export default ErrorBoundary
