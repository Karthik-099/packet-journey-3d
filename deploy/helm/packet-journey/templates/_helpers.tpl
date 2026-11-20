{{- define "pj.name" -}}{{ .Chart.Name }}{{- end -}}
{{- define "pj.fullname" -}}{{ printf "%s" .Release.Name | trunc 63 | trimSuffix "-" }}{{- end -}}
{{- define "pj.labels" -}}
app.kubernetes.io/name: {{ include "pj.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Values.image.tag | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}
{{- define "pj.selector" -}}
app.kubernetes.io/name: {{ include "pj.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
