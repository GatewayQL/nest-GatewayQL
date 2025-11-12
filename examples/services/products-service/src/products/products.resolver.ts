import { Resolver, Query, Mutation, Args, ID, ResolveReference } from '@nestjs/graphql';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { CreateProductInput } from './dto/create-product.input';

@Resolver(() => Product)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Mutation(() => Product)
  createProduct(@Args('createProductInput') createProductInput: CreateProductInput) {
    return this.productsService.create(createProductInput);
  }

  @Query(() => [Product], { name: 'products' })
  findAll() {
    return this.productsService.findAll();
  }

  @Query(() => Product, { name: 'product', nullable: true })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.findOne(id);
  }

  @Mutation(() => Boolean)
  removeProduct(@Args('id', { type: () => ID }) id: string) {
    return this.productsService.remove(id);
  }

  @Mutation(() => [Product])
  seedProducts() {
    return this.productsService.seed();
  }

  // Federation: Entity reference resolver
  @ResolveReference()
  resolveReference(reference: { __typename: string; id: string }) {
    return this.productsService.findOne(reference.id);
  }
}