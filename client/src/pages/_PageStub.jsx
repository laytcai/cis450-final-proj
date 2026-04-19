import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PageStub({ title, subtitle, phase, endpoints = [] }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="outline" className="border-primary/40 text-primary">
          Coming in {phase}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wired endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-xs text-muted-foreground">
          {endpoints.length === 0 && <p>No endpoints listed.</p>}
          {endpoints.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
