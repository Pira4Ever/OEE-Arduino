package main

import (
	"context"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	chiproxy "github.com/awslabs/aws-lambda-go-api-proxy/chi"
	"github.com/go-chi/chi/v5"
)

var adapter *chiproxy.ChiLambda

func FirstHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("OK"))
}

func SecondHandler(w http.ResponseWriter, r *http.Request) {

}

func init() {
	r := chi.NewRouter()

	r.Get("/api/route", FirstHandler)
	r.Post("/api/route", SecondHandler)

	adapter = chiproxy.New(r)
}

func lambdaHandler(ctx context.Context, r events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	c, err := adapter.ProxyWithContext(ctx, r)

	return c, err
}

func main() {
	lambda.Start(lambdaHandler)
}
